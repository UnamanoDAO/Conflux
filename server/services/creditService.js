/**
 * 积分服务 - 管理用户弹珠（玻璃球）系统
 * 1弹珠 = 0.001美元
 */

const { getConnection } = require('../database');
const imageCacheService = require('./imageCacheService');

class CreditService {
  /**
   * 获取用户积分余额
   */
  async getUserBalance(userId) {
    try {
      // 先从缓存获取
      const cached = await imageCacheService.getUserCredits(userId);
      if (cached !== null) {
        console.log(`从缓存获取用户 ${userId} 的积分余额:`, cached);
        return {
          balance: parseFloat(cached.balance),
          total_recharged: parseFloat(cached.total_recharged),
          total_consumed: parseFloat(cached.total_consumed)
        };
      }

      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM user_credits WHERE user_id = ?',
        [userId]
      );

      if (rows.length === 0) {
        // 如果用户没有积分记录，创建一条初始记录
        await this.initializeUserCredits(userId);
        const result = {
          balance: 0,
          total_recharged: 0,
          total_consumed: 0
        };
        // 缓存结果（30秒）
        await imageCacheService.cacheUserCredits(userId, result);
        return result;
      }

      const result = {
        balance: parseFloat(rows[0].balance),
        total_recharged: parseFloat(rows[0].total_recharged),
        total_consumed: parseFloat(rows[0].total_consumed)
      };

      // 缓存结果（30秒）
      await imageCacheService.cacheUserCredits(userId, result);

      return result;
    } catch (error) {
      console.error('获取用户余额失败:', error);
      throw new Error('获取用户余额失败');
    }
  }

  /**
   * 初始化用户积分账户
   */
  async initializeUserCredits(userId) {
    try {
      const connection = getConnection();
      await connection.execute(
        'INSERT INTO user_credits (user_id, balance, total_recharged, total_consumed) VALUES (?, 0, 0, 0)',
        [userId]
      );
    } catch (error) {
      // 忽略重复键错误
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }

  /**
   * 检查用户余额是否足够
   */
  async checkBalance(userId, requiredAmount) {
    const { balance } = await this.getUserBalance(userId);
    return balance >= requiredAmount;
  }

  /**
   * 消费积分（需要在事务中调用）
   * @param {Object} connection - 数据库连接（事务）
   * @param {number} userId - 用户ID
   * @param {number} amount - 消费金额（弹珠数）
   * @param {string} description - 消费描述
   * @param {number} generationId - 关联的生成记录ID
   * @param {string} ipAddress - IP地址
   * @returns {Object} 交易记录
   */
  async consumeCredits(connection, userId, amount, description, generationId = null, ipAddress = null) {
    try {
      // 1. 获取当前余额（行锁）
      const [balanceRows] = await connection.query(
        'SELECT balance FROM user_credits WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (balanceRows.length === 0) {
        throw new Error('用户积分账户不存在');
      }

      const balanceBefore = parseFloat(balanceRows[0].balance);

      // 2. 检查余额是否充足
      if (balanceBefore < amount) {
        throw new Error(`积分不足，当前余额：${balanceBefore}弹珠，需要：${amount}弹珠`);
      }

      const balanceAfter = balanceBefore - amount;

      // 3. 更新余额和累计消费
      await connection.query(
        'UPDATE user_credits SET balance = ?, total_consumed = total_consumed + ?, updated_at = NOW() WHERE user_id = ?',
        [balanceAfter, amount, userId]
      );

      // 4. 记录交易
      const [result] = await connection.query(
        `INSERT INTO credit_transactions
        (user_id, transaction_type, amount, balance_before, balance_after, description, related_generation_id, ip_address)
        VALUES (?, 'consume', ?, ?, ?, ?, ?, ?)`,
        [userId, -amount, balanceBefore, balanceAfter, description, generationId, ipAddress]
      );

      // 5. 清除积分缓存
      await imageCacheService.redis.del(`user:${userId}:credits`);

      return {
        transaction_id: result.insertId,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        amount: amount
      };
    } catch (error) {
      console.error('消费积分失败:', error);
      throw error;
    }
  }

  /**
   * 充值积分（管理员操作或支付回调）
   * @param {number} userId - 用户ID
   * @param {number} amount - 充值金额（弹珠数）
   * @param {string} type - 类型：'recharge'(支付充值) 或 'admin_grant'(管理员赠送)
   * @param {string} description - 充值描述
   * @param {string} orderNo - 订单号（支付充值时必填）
   * @param {number} adminUserId - 操作管理员ID（管理员操作时必填）
   * @param {string} ipAddress - IP地址
   */
  async addCredits(userId, amount, type = 'recharge', description = '', orderNo = null, adminUserId = null, ipAddress = null) {
    const pool = getConnection();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. 确保用户有积分账户
      const [userCredits] = await connection.execute(
        'SELECT balance FROM user_credits WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      let balanceBefore = 0;
      if (userCredits.length === 0) {
        // 创建账户
        await connection.execute(
          'INSERT INTO user_credits (user_id, balance, total_recharged, total_consumed) VALUES (?, 0, 0, 0)',
          [userId]
        );
      } else {
        balanceBefore = parseFloat(userCredits[0].balance);
      }

      const balanceAfter = balanceBefore + amount;

      // 2. 更新余额
      if (type === 'admin_grant') {
        // 管理员赠送不计入total_recharged
        await connection.execute(
          'UPDATE user_credits SET balance = ?, updated_at = NOW() WHERE user_id = ?',
          [balanceAfter, userId]
        );
      } else {
        // 充值计入total_recharged
        await connection.execute(
          'UPDATE user_credits SET balance = ?, total_recharged = total_recharged + ?, updated_at = NOW() WHERE user_id = ?',
          [balanceAfter, amount, userId]
        );
      }

      // 3. 记录交易
      const [result] = await connection.execute(
        `INSERT INTO credit_transactions
        (user_id, transaction_type, amount, balance_before, balance_after, description, related_order_id, admin_user_id, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, type, amount, balanceBefore, balanceAfter, description, orderNo, adminUserId, ipAddress]
      );

      await connection.commit();

      // 4. 清除积分缓存
      await imageCacheService.redis.del(`user:${userId}:credits`);

      return {
        transaction_id: result.insertId,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        amount: amount
      };
    } catch (error) {
      await connection.rollback();
      console.error('充值积分失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 管理员给用户添加积分（仅增加，不可减少）
   */
  async adminGrantCredits(adminUserId, targetUserId, amount, description, ipAddress = null) {
    if (amount <= 0) {
      throw new Error('赠送金额必须大于0');
    }

    return await this.addCredits(
      targetUserId,
      amount,
      'admin_grant',
      description || `管理员赠送${amount}弹珠`,
      null,
      adminUserId,
      ipAddress
    );
  }

  /**
   * 获取用户交易记录
   */
  async getUserTransactions(userId, page = 1, pageSize = 20, type = null) {
    try {
      const connection = getConnection();
      const offset = (page - 1) * pageSize;

      let whereClause = 'WHERE user_id = ?';
      let params = [userId];

      if (type) {
        whereClause += ' AND transaction_type = ?';
        params.push(type);
      }

      // 查询总数
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM credit_transactions ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 查询记录
      const selectParams = [...params, parseInt(pageSize), parseInt(offset)];
      const [rows] = await connection.execute(
        `SELECT
          id, transaction_type, amount, balance_before, balance_after,
          description, related_order_id, related_generation_id, admin_user_id,
          ip_address, created_at
        FROM credit_transactions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        selectParams
      );

      return {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        transactions: rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount),
          balance_before: parseFloat(row.balance_before),
          balance_after: parseFloat(row.balance_after)
        }))
      };
    } catch (error) {
      console.error('获取交易记录失败:', error);
      throw new Error('获取交易记录失败');
    }
  }

  /**
   * 创建充值订单
   */
  async createRechargeOrder(userId, amount, credits, paymentMethod = null, ipAddress = null, userAgent = null) {
    try {
      const connection = getConnection();
      // 生成订单号：CR + 时间戳 + 随机数
      const orderNo = `CR${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // 订单30分钟后过期
      const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

      const [result] = await connection.execute(
        `INSERT INTO recharge_orders
        (order_no, user_id, amount, credits, payment_method, payment_status, ip_address, user_agent, expired_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [orderNo, userId, amount, credits, paymentMethod, ipAddress, userAgent, expiredAt]
      );

      return {
        order_id: result.insertId,
        order_no: orderNo,
        amount,
        credits,
        expired_at: expiredAt
      };
    } catch (error) {
      console.error('创建充值订单失败:', error);
      throw new Error('创建充值订单失败');
    }
  }

  /**
   * 获取充值订单详情
   */
  async getRechargeOrder(orderNo) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM recharge_orders WHERE order_no = ?',
        [orderNo]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        amount: parseFloat(rows[0].amount),
        credits: parseFloat(rows[0].credits)
      };
    } catch (error) {
      console.error('获取充值订单失败:', error);
      throw new Error('获取充值订单失败');
    }
  }

  /**
   * 更新充值订单状态（支付回调）
   */
  async updateRechargeOrderStatus(orderNo, status, paymentData = {}) {
    const pool = getConnection();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. 获取订单信息（行锁）
      const [orders] = await connection.query(
        'SELECT * FROM recharge_orders WHERE order_no = ? FOR UPDATE',
        [orderNo]
      );

      if (orders.length === 0) {
        throw new Error('订单不存在');
      }

      const order = orders[0];

      // 2. 检查订单状态
      if (order.payment_status !== 'pending') {
        throw new Error(`订单状态已更新为${order.payment_status}，无法重复处理`);
      }

      // 3. 检查订单是否过期
      if (new Date() > new Date(order.expired_at)) {
        await connection.query(
          'UPDATE recharge_orders SET payment_status = "cancelled", updated_at = NOW() WHERE order_no = ?',
          [orderNo]
        );
        throw new Error('订单已过期');
      }

      // 4. 更新订单状态
      await connection.query(
        `UPDATE recharge_orders
        SET payment_status = ?, payment_time = NOW(), payment_channel_order_no = ?, payment_data = ?, updated_at = NOW()
        WHERE order_no = ?`,
        [status, paymentData.channel_order_no, JSON.stringify(paymentData), orderNo]
      );

      // 5. 如果支付成功，给用户增加积分
      if (status === 'paid') {
        await this.addCredits(
          order.user_id,
          parseFloat(order.credits),
          'recharge',
          `充值订单：${orderNo}`,
          orderNo,
          null,
          null
        );
      }

      await connection.commit();

      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error('更新充值订单状态失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取系统积分统计（管理员）
   */
  async getCreditStatistics() {
    try {
      const connection = getConnection();
      // 1. 总用户余额
      const [totalBalance] = await connection.execute(
        'SELECT SUM(balance) as total_balance FROM user_credits'
      );

      // 2. 总充值金额
      const [totalRecharged] = await connection.execute(
        'SELECT SUM(total_recharged) as total_recharged FROM user_credits'
      );

      // 3. 总消费金额
      const [totalConsumed] = await connection.execute(
        'SELECT SUM(total_consumed) as total_consumed FROM user_credits'
      );

      // 4. 今日充值
      const [todayRecharge] = await connection.execute(
        `SELECT SUM(amount) as today_recharge
        FROM credit_transactions
        WHERE transaction_type IN ('recharge', 'admin_grant')
        AND DATE(created_at) = CURDATE()`
      );

      // 5. 今日消费
      const [todayConsume] = await connection.execute(
        `SELECT SUM(ABS(amount)) as today_consume
        FROM credit_transactions
        WHERE transaction_type = 'consume'
        AND DATE(created_at) = CURDATE()`
      );

      // 6. 待支付订单数
      const [pendingOrders] = await connection.execute(
        'SELECT COUNT(*) as pending_orders FROM recharge_orders WHERE payment_status = "pending" AND expired_at > NOW()'
      );

      return {
        total_balance: parseFloat(totalBalance[0].total_balance) || 0,
        total_recharged: parseFloat(totalRecharged[0].total_recharged) || 0,
        total_consumed: parseFloat(totalConsumed[0].total_consumed) || 0,
        today_recharge: parseFloat(todayRecharge[0].today_recharge) || 0,
        today_consume: parseFloat(todayConsume[0].today_consume) || 0,
        pending_orders: pendingOrders[0].pending_orders || 0
      };
    } catch (error) {
      console.error('获取积分统计失败:', error);
      throw new Error('获取积分统计失败');
    }
  }
}

module.exports = new CreditService();

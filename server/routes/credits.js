/**
 * 积分管理路由
 */

const express = require('express');
const router = express.Router();
const creditService = require('../services/creditService');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取当前用户积分余额
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await creditService.getUserBalance(req.user.id);
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('获取余额失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取当前用户交易记录
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type } = req.query;

    const result = await creditService.getUserTransactions(
      req.user.id,
      parseInt(page),
      parseInt(pageSize),
      type
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建充值订单
 */
router.post('/recharge/create', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_method } = req.body;

    // 验证充值金额
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '充值金额必须大于0'
      });
    }

    // 计算弹珠数：1美元 = 1000弹珠
    const credits = amount * 1000;

    const order = await creditService.createRechargeOrder(
      req.user.id,
      amount,
      credits,
      payment_method,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      data: order,
      message: '充值订单创建成功，请完成支付'
    });
  } catch (error) {
    console.error('创建充值订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 查询充值订单状态
 */
router.get('/recharge/order/:orderNo', authenticateToken, async (req, res) => {
  try {
    const { orderNo } = req.params;

    const order = await creditService.getRechargeOrder(orderNo);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 验证订单所有权
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权访问此订单'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 支付回调接口（预留，需要根据具体支付渠道实现）
 * 注意：此接口需要验证支付渠道的签名，确保安全性
 */
router.post('/recharge/callback/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const callbackData = req.body;

    // TODO: 根据不同支付渠道验证签名
    // if (channel === 'alipay') {
    //   // 验证支付宝签名
    // } else if (channel === 'wechat') {
    //   // 验证微信支付签名
    // } else if (channel === 'stripe') {
    //   // 验证Stripe签名
    // }

    // 提取订单号和支付状态
    const { order_no, status, channel_order_no } = callbackData;

    if (!order_no) {
      return res.status(400).json({
        success: false,
        error: '订单号缺失'
      });
    }

    // 更新订单状态
    await creditService.updateRechargeOrderStatus(order_no, status, {
      channel,
      channel_order_no,
      callback_data: callbackData
    });

    res.json({
      success: true,
      message: '支付回调处理成功'
    });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 检查积分是否充足（用于前端预检查）
 */
router.post('/check-balance', authenticateToken, async (req, res) => {
  try {
    const { required_amount } = req.body;

    if (!required_amount || required_amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的所需金额'
      });
    }

    const balance = await creditService.getUserBalance(req.user.id);
    const isEnough = balance.balance >= required_amount;

    res.json({
      success: true,
      data: {
        current_balance: balance.balance,
        required_amount,
        is_enough: isEnough,
        shortage: isEnough ? 0 : required_amount - balance.balance
      }
    });
  } catch (error) {
    console.error('检查余额失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

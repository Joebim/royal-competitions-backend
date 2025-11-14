import { Request, Response, NextFunction } from 'express';
import {
  Champion,
  Competition,
  Draw,
  Order,
  User,
} from '../models';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiResponse } from '../utils/apiResponse';

const formatCurrency = (amount: number, currency = 'GBP') => ({
  amount,
  currency,
  formatted: new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount),
});

export const getDashboardSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalCompetitions,
      activeCompetitions,
      totalDraws,
      totalChampions,
      featuredChampions,
      totalUsers,
      revenueAggregate,
      recentDraws,
      recentOrders,
    ] = await Promise.all([
      Competition.countDocuments({}),
      Competition.countDocuments({
        status: CompetitionStatus.LIVE,
        isActive: true,
      }),
      Draw.countDocuments({}),
      Champion.countDocuments({}),
      Champion.countDocuments({ featured: true, isActive: true }),
      User.countDocuments({}),
      Order.aggregate([
        {
          $match: {
            paymentStatus: OrderPaymentStatus.PAID,
            status: { $in: [OrderStatus.PROCESSING, OrderStatus.COMPLETED] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amountPence' }, // Use amountPence instead of total
          },
        },
      ]),
      Draw.find({})
        .populate('competitionId', 'title prize')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find({ paymentStatus: OrderPaymentStatus.PAID })
        .populate('competitionId', 'title')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Convert revenue from pence to pounds
    const revenueTotalPence = revenueAggregate[0]?.total || 0;
    const revenueTotal = revenueTotalPence / 100;

    const recentActivity = [
      ...recentDraws.map((draw: any) => ({
        type: 'draw_created',
        description: `Draw completed for ${draw.competitionId?.title || 'Competition'}`,
        data: {
          competitionId: draw.competitionId?._id || draw.competitionId,
          competitionTitle: draw.competitionId?.title || 'Unknown',
          prize: draw.competitionId?.prize || 'Unknown',
          drawTime: draw.drawTime,
          drawMethod: draw.drawMethod,
        },
        timestamp: draw.createdAt || draw.drawTime,
      })),
      ...recentOrders.map((order: any) => ({
        type: 'order_paid',
        description: `Order paid for ${order.competitionId?.title || 'Competition'}`,
        data: {
          orderId: order._id,
          competitionId: order.competitionId?._id || order.competitionId,
          competitionTitle: order.competitionId?.title || 'Unknown',
          amountPence: order.amountPence,
          amountGBP: (order.amountPence / 100).toFixed(2),
          currency: order.currency,
          quantity: order.quantity,
        },
        timestamp: order.updatedAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    res.json(
      ApiResponse.success(
        {
          competitions: {
            total: totalCompetitions,
            active: activeCompetitions,
          },
          draws: {
            total: totalDraws,
          },
          champions: {
            total: totalChampions,
            featured: featuredChampions,
          },
          users: {
            total: totalUsers,
          },
          revenue: formatCurrency(revenueTotal),
          recentActivity,
        },
        'Dashboard summary retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};


// order-service/src/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { StripeService } from 'src/stripe/stripe.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async getAllOrder() {
    try {
      let result = await this.prisma.orders.findMany({
        include: {
          order_items: true,
          users: true,
        },
      });
      return {
        message: 'Lấy danh sách order thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error fetching order:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async getAllOrderId(id: number) {
    try {
      let result = await this.prisma.orders.findUnique({
        where: { id },
        include: {
          order_items: true,
          users: true,
          shipping_address: true,
        },
      });
      const order_items = await this.prisma.order_items.findMany({
        where: { order_id: result.id },
        include: {
          product_variants: {
            include: {
              products: {
                include: {
                  product_images: true,
                },
              },
            },
          },
        },
      });
      if (!result)
        throw new RpcException({
          statusCode: 400,
          message: 'Ko có id đơn hàng tồn tại',
        });

      return {
        message: 'Lấy danh sách order thành công',
        data: { result, order_items },
      };
    } catch (error) {
      console.error('Error fetching order:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async createOrder(data: {
    user_id?: number;
    items: { product_variant_id: number; quantity: number; price?: number }[];
    total_amount: number;
    discount_code?: string;
    shipping_address_id: number;
    shipping_cost?: number;
    points_used?: number;
    guest_email?: string;
  }) {
    try {
      // Kiể
      //m tra user_id tồn tại

      const user = await this.prisma.users.findUnique({
        where: { id: data.user_id },
      });
      if (!user && !data.guest_email) {
        throw new RpcException({
          statusCode: 400,
          message: 'Phải cung cấp user_id hoặc guest_email',
        });
      }
      let discountCheck = null;
      if (data.discount_code) {
        discountCheck = await this.prisma.discount_codes.findUnique({
          where: { code: data.discount_code },
        });

        if (!discountCheck) {
          throw new RpcException({
            statusCode: 400,
            message: 'Sai id discount code',
          });
        }
      }
      // Tạo đơn hàng
      const order = await this.prisma.orders.create({
        data: {
          user_id: data.user_id,
          discount_code_id: discountCheck ? discountCheck.id : null,
          total_amount: data.total_amount,
          status: 'pending',
          shipping_address_id: data.shipping_address_id,
          created_at: new Date(),
          shipping_cost: data.shipping_cost || 0,
          points_used: data.points_used || 0,
          guest_email: data.guest_email,
        },
      });

      // Tạo order_items
      await this.prisma.order_items.createMany({
        data: data.items.map((item) => ({
          order_id: order.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          price: item.price || 0,
        })),
      });

      // Query lại order_items vừa tạo
      const order_items = await this.prisma.order_items.findMany({
        where: { order_id: order.id },
        include: {
          product_variants: {
            include: {
              products: {
                include: {
                  product_images: true,
                },
              },
            },
          },
        },
      });
      return {
        message: 'Tạo đơn hàng thành công',
        email: user.email,
        data: { order, order_items },
      };
    } catch (error) {
      console.error('Error creating order:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async getOrders(data: { user_id: number }) {
    try {
      const orders = await this.prisma.orders.findMany({
        where: { user_id: data.user_id },
        include: {
          discount_codes: {
            select: {
              code: true,
              description: true,
              discount_type: true,
              value: true,
            },
          },
        },
      });

      // 2️⃣ Lấy toàn bộ order_items của các order_id vừa tìm
      const orderIds = orders.map((o) => o.id);
      const items = await this.prisma.order_items.findMany({
        where: {
          order_id: { in: orderIds },
        },
        include: {
          product_variants: {
            include: {
              products: {
                include: {
                  product_images: true,
                },
              },
            },
          },
        },
      });

      const result = orders.map((order) => ({
        ...order,
        order_items: items.filter((i) => i.order_id === order.id),
      }));

      return {
        message: 'Lấy danh sách đơn hàng thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async getOrderById(data: { user_id: number; order_id: number }) {
    try {
      const order = await this.prisma.orders.findUnique({
        where: { id: data.order_id },
        include: {
          discount_codes: {
            select: {
              code: true,
              description: true,
              discount_type: true,
              value: true,
            },
          },
          shipping_address: true,
        },
      });
      if (!order) {
        throw new RpcException({
          statusCode: 404,
          message: 'Đơn hàng không tồn tại',
        });
      }
      const order_items = await this.prisma.order_items.findMany({
        where: { order_id: data.order_id },
        include: {
          product_variants: {
            include: {
              products: {
                include: {
                  product_images: true,
                },
              },
            },
          },
        },
      });
      if (order.user_id !== data.user_id && !order.guest_email) {
        throw new RpcException({
          statusCode: 403,
          message: 'Bạn không có quyền truy cập đơn hàng này',
        });
      }

      return {
        message: 'Lấy thông tin đơn hàng thành công',
        data: { order, order_items },
      };
    } catch (error) {
      console.error('Error fetching order:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async updateOrderStatus(data: {
    user_id: number;
    order_id: number;
    status: string;
  }) {
    try {
      const order = await this.prisma.orders.findUnique({
        where: { id: data.order_id },
      });

      if (!order) {
        throw new RpcException({
          statusCode: 404,
          message: 'Đơn hàng không tồn tại',
        });
      }
      const updatedOrder = await this.prisma.orders.update({
        where: { id: data.order_id },
        data: { status: data.status },
        include: {
          discount_codes: {
            select: {
              code: true,
              description: true,
              discount_type: true,
              value: true,
            },
          },
        },
      });

      return {
        message: 'Cập nhật trạng thái đơn hàng thành công',
        data: updatedOrder,
      };
    } catch (error) {
      console.error('Error updating order status:', error.message);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async createPaymentIntent(totalAmount: number) {
    const paymentIntent = await this.stripe.createPaymentIntent(totalAmount);

    // Lưu payment_intent_id vào đơn hàng

    return {
      message: 'Tạo thanh toán thành công',
      data: {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      },
    };
  }

  async guestOrder(data: {
    user_id?: number;
    items: { product_variant_id: number; quantity: number; price?: number }[];
    total_amount: number;
    discount_code?: string;
    shipping_address_id: number;
    shipping_cost?: number;
    points_used?: number;
    guest_email?: string;
  }) {
    try {
      // --- 1. Check user or guest ---
      let user = null;

      if (data.user_id) {
        user = await this.prisma.users.findUnique({
          where: { id: data.user_id },
        });
      }

      if (!user && !data.guest_email) {
        throw new RpcException({
          statusCode: 400,
          message: 'Phải cung cấp user_id hoặc guest_email',
        });
      }

      // --- 2. Check discount ---
      let discountCheck = null;

      if (data.discount_code) {
        discountCheck = await this.prisma.discount_codes.findUnique({
          where: { code: data.discount_code },
        });

        if (!discountCheck) {
          throw new RpcException({
            statusCode: 400,
            message: 'Sai id discount code',
          });
        }
      }

      // --- 3. Create order ---
      const order = await this.prisma.orders.create({
        data: {
          user_id: data.user_id,
          discount_code_id: discountCheck ? discountCheck.id : null,
          total_amount: data.total_amount,
          status: 'pending',
          shipping_address_id: data.shipping_address_id,
          created_at: new Date(),
          shipping_cost: data.shipping_cost || 0,
          points_used: data.points_used || 0,
          guest_email: data.guest_email,
        },
      });

      // --- 4. Create items ---
      await this.prisma.order_items.createMany({
        data: data.items.map((item) => ({
          order_id: order.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          price: item.price || 0,
        })),
      });

      const order_items = await this.prisma.order_items.findMany({
        where: { order_id: order.id },
        include: {
          product_variants: {
            include: {
              products: {
                include: { product_images: true },
              },
            },
          },
        },
      });

      return {
        message: 'Tạo đơn hàng thành công',
        email: user ? user.email : data.guest_email,
        data: { order, order_items },
      };
    } catch (error) {
      console.error('Error creating order:', error.message);

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }
}

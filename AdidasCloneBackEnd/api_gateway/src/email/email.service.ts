import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendOTPEmail(email: string, otp: string) {
    const html = `
      <h2>Đặt lại mật khẩu</h2>
      <p>Mã OTP: <strong style="font-size: 24px; color: #d32f2f;">${otp}</strong></p>
      <p>Hiệu lực trong <strong>5 phút</strong>.</p>
    `;

    await this.transporter.sendMail({
      from: `"E-Shop" <${this.configService.get('SMTP_USER')}>`,
      to: email,
      subject: 'Đặt lại mật khẩu - E-Shop',
      html,
    });
  }
  async sendMailOrderSuccess(email: string, orderData: any) {
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };
    const orderItems = orderData.order_items;
    const itemsHtml = orderItems
      .map(
        (item: any) => `
    <tr>
      <td style="padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="100" style="vertical-align: top;">
              <img src="${item.product_variants.products.product_images.image_url}" alt="${item.product_variants.products.name}" 
                   style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" />
            </td>
            <td style="padding-left: 20px; vertical-align: top;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111;">${item.product_variants.products.name}</h3>
              <p style="margin: 4px 0; font-size: 14px; color: #757575;">${item.product_variants.products.description}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #757575;">Màu sắc: ${item.product_variants.color}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #757575;">Size: ${item.product_variants.size}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #757575;">Số lượng: ${item.quantity}</p>
            </td>
            <td style="text-align: right; vertical-align: top; white-space: nowrap;">
              <strong style="font-size: 16px; color: #111;">${formatPrice(item.price)}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận đơn hàng - Nike</title>
  <link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
  integrity="sha512-SOMEHASH"
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
/>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <svg width="80" height="32" viewBox="0 0 69 32" fill="#111">
                      <path d="M68.56 4L18.4 25.36Q12.16 28 7.92 28q-4.8 0-6.96-3.36-1.36-2.16-.8-5.48t2.96-7.08q2-3.04 6.56-8-1.6 2.56-2.24 5.28-1.2 5.12 2.72 7.68Q13.6 19.2 18 17.88l50.56-21.6v7.68z"/>
                    </svg>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Success Message -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center;">
<div style="display:inline-flex; align-items:center; justify-content:center; width:80px; height:80px; background-color:#10b981; border-radius:50%; margin-bottom:20px;">
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
</div>
              <h1 style="margin: 0 0 15px 0; font-size: 32px; font-weight: bold; color: #111;">Đơn hàng đã được xác nhận!</h1>
              <p style="margin: 0; font-size: 16px; color: #757575; line-height: 1.6;">
                Cảm ơn bạn đã đặt hàng. Chúng tôi đã gửi email xác nhận đến <strong>${email}</strong>
              </p>
            </td>
          </tr>

          <!-- Order Info Box -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                <tr>
                  <td width="50%">
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #757575;">Mã đơn hàng</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111;">${orderData.order.id}</p>
                  </td>
                  <td width="50%" style="text-align: right;">
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #757575;">Ngày đặt hàng</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111;">2/12/2025</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Info -->
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <div style="display: inline-flex; align-items: center; gap: 8px; color: #10b981;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <span style="font-weight: 600; font-size: 15px;">Giao hàng dự kiến:5/12/2025</span>
              </div>
            </td>
          </tr>

          <!-- Track Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="#" style="display: inline-block; background-color: #111; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 30px; font-weight: 600; font-size: 15px;">
                Theo dõi đơn hàng
              </a>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; border-top: 1px solid #e5e7eb;">
              <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: bold; color: #111; display: flex; align-items: center; gap: 10px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2">
                  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Chi tiết đơn hàng
              </h2>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td style="padding: 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 0; color: #757575; font-size: 15px;">Tạm tính</td>
                  <td style="padding: 8px 0; text-align: right; color: #757575; font-size: 15px;">9999999</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575; font-size: 15px;">Phí vận chuyển</td>
                  <td style="padding: 8px 0; text-align: right; color: #757575; font-size: 15px;">Miễn phí</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 15px; border-top: 2px solid #e5e7eb;"></td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 0 0; font-size: 20px; font-weight: bold; color: #111;">Tổng cộng</td>
                  <td style="padding: 15px 0 0 0; text-align: right; font-size: 20px; font-weight: bold; color: #111;">99999999</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping & Payment Info -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48%" style="vertical-align: top; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #111; display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      Địa chỉ giao hàng
                    </h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #111;">
                      <strong>${orderData.order.shipping_address}</strong><br/>

                    </p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align: top; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #111; display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      Phương thức thanh toán
                    </h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #111;">
                      Stripe
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Notice -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; display: flex; gap: 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2" style="flex-shrink: 0;">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <div>
                  <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #1e3a8a;">Xác nhận đơn hàng đã được gửi</h4>
                  <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                    Chúng tôi đã gửi email xác nhận chi tiết đến ${email}. Vui lòng kiểm tra hộp thư để biết thông tin theo dõi đơn hàng và cập nhật.
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Action Buttons -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48%" style="text-align: center;">
                    <a href="#" style="display: inline-block; width: 100%; background-color: #ffffff; color: #111; text-decoration: none; padding: 14px 20px; border: 2px solid #111; border-radius: 30px; font-weight: 600; font-size: 14px; box-sizing: border-box;">
                      Tiếp tục mua sắm
                    </a>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="text-align: center;">
                    <a href="#" style="display: inline-block; width: 100%; background-color: #111; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 30px; font-weight: 600; font-size: 14px; box-sizing: border-box;">
                      Lịch sử đơn hàng
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #757575;">
                Cảm ơn bạn đã mua sắm tại Nike!
              </p>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #757575;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ 
                <a href="mailto:support@nike.com" style="color: #111; text-decoration: none; font-weight: 600;">support@nike.com</a>
              </p>
              <div style="margin-top: 20px;">
                <a href="#" style="margin: 0 8px; text-decoration: none; color: #757575; font-size: 13px;">Facebook</a>
                <a href="#" style="margin: 0 8px; text-decoration: none; color: #757575; font-size: 13px;">Instagram</a>
                <a href="#" style="margin: 0 8px; text-decoration: none; color: #757575; font-size: 13px;">Twitter</a>
              </div>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
                © 2024 Nike, Inc. All Rights Reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

    await this.transporter.sendMail({
      from: `"Nike Store" <${this.configService.get('EMAIL_USER')}>`,
      to: email,
      subject: `Xác nhận đơn hàng #${orderData.order.id} - Nike`,
      html,
    });
  }
}

// user-service/src/wishlists/wishlists.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WishlistsService } from './wishlists.service';
import { RMQ_PATTERN_WISHLISTS } from '../common/constants/rmq.pattern';

@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @MessagePattern({ cmd: RMQ_PATTERN_WISHLISTS.ADD_WISHLIST })
  async addWishlist(@Payload() data: { user_id: number; product_id: number }) {
    return this.wishlistsService.addWishlist(data);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_WISHLISTS.GET_WISHLISTS })
  async getWishlists(@Payload() user_id: number) {
    return this.wishlistsService.getWishlists(user_id);
  }

  @MessagePattern({ cmd: RMQ_PATTERN_WISHLISTS.REMOVE_WISHLIST })
  async removeWishlist(
    @Payload() data: { user_id: number; product_id: number },
  ) {
    return this.wishlistsService.removeWishlist(data);
  }
}

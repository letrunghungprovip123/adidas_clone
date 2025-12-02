export const RMQ_PATTERN_USER = {
  POST_USER: 'post_user',
  GET_USER: 'get_user',
  GET_USER_ID: 'get_user_id',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
};

export const RMQ_PATTERN_ADDRESS = {
  GET_ADDRESSES: 'get_addresses',
  POST_ADDRESS: 'post_addresses',
  UPDATE_ADDRESS: 'update_addresses',
  DELETE_ADDRESS: 'delete_addresses',
  GET_BY_USER_ID: 'get_addresses_by_user_id',
};

export const RMQ_PATTERN_LOYALTY_POINT = {
  GET_LOYALTY: 'get_loyalty',
  CREATE_LOYALTY: 'create_loyalty',
  UPDATE_LOYALTY: 'update_loyalty',
  DELETE_LOYALTY: 'delete_loyalty',
};

export const RMQ_PATTERN_PRODUCTS = {
  GET_PRODUCT: 'get_product',
  GET_PRODUCT_ID: 'get_product_id',
  CREATE_PRODUCT: 'create_product',
  UPDATE_PRODUCT: 'update_product',
  DELETE_PRODUCT: 'delete_product',
  CREATE_PRODUCT_VARIANT: 'create_product_variant',
  UPDATE_PRODUCT_VARIANT: 'update_product_variant',
  ADD_PRODUCT_IMAGE: 'add_product_image',
  GET_PAGINATED: 'get_paginated_products',
  SEARCH: 'search_products',
  GET_BY_CATEGORY: 'get_products_by_category',
  AI_SUGGESTION: 'ai_suggestion',
};

export const RMQ_PATTERN_REVIEWS = {
  GET_REVIEWS: 'get_reviews',
  GET_REVIEW_ID: 'get_review_id',
  CREATE_REVIEW: 'create_review',
  UPDATE_REVIEW: 'update_review',
  DELETE_REVIEW: 'delete_review',
};

export const RMQ_PATTERN_AUTH = {
  SIGNUP: 'signup_user',
  LOGIN: 'login_user',
  CHANGE_PASSWORD: 'change_password',
  GET_USER_BY_EMAIL: 'get_user_by_email',
  SAVE_OTP: 'save_otp', // ← MỚI
  VERIFY_OTP: 'verify_otp', // ← MỚI: Chỉ kiểm tra OTP
  RESET_PASSWORD: 'reset_password',
  SOCIAL_LOGIN: 'social_login', // ← MỚI
};
export const RMQ_PATTERN_WISHLISTS = {
  ADD_WISHLIST: 'add_wishlist',
  GET_WISHLISTS: 'get_wishlists',
  REMOVE_WISHLIST: 'remove_wishlist',
};

export const RMQ_PATTERN_DISCOUNTS = {
  APPLY_DISCOUNT: 'apply_discount',
  GET_DISCOUNTS: 'get_discounts',
  GET_DISCOUNT_BY_CODE: 'get_discount_by_code',
  DELETE_DISCOUNT: 'delete_discount',
  UPDATE_DISCOUNT: 'update_discount',
  CREATE_DISCOUNT: 'create_discount',
};

export const RMQ_PATTERN_ORDERS = {
  CREATE_ORDER: 'create_order',
  GET_ORDERS: 'get_orders',
  GET_ORDER_BY_ID: 'get_order_by_id',
  UPDATE_ORDER_STATUS: 'update_order_status',
  GET_ALL_ORDER: 'get_all_order',
  GET_ALL_ORDER_ID: 'get_all_order_id',
  GUEST_ORDER: 'guest_order',
};

// api-gateway/src/constants.ts & product-service/src/common/constants/rmq.pattern.ts
export const RMQ_PATTERN_CATEGORIES = {
  GET_ALL: 'get_all_categories',
};

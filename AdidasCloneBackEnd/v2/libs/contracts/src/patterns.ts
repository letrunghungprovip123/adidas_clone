export const RMQ = {
  identity: {
    health: { cmd: 'identity.health' },
    signup: { cmd: 'identity.signup' },
    login: { cmd: 'identity.login' },
    validateToken: { cmd: 'identity.validate-token' },
    requestPasswordReset: { cmd: 'identity.request-password-reset' },
    resetPassword: { cmd: 'identity.reset-password' },
  },
  customer: {
    health: { cmd: 'customer.health' },
    getProfile: { cmd: 'customer.get-profile' },
    getAddresses: { cmd: 'customer.get-addresses' },
    validateLoyalty: { cmd: 'customer.validate-loyalty' },
  },
  catalog: {
    health: { cmd: 'catalog.health' },
    getProduct: { cmd: 'catalog.get-product' },
    getVariantSnapshots: { cmd: 'catalog.get-variant-snapshots' },
    search: { cmd: 'catalog.search' },
  },
  inventory: {
    health: { cmd: 'inventory.health' },
    reserve: { cmd: 'inventory.reserve' },
    release: { cmd: 'inventory.release' },
    commit: { cmd: 'inventory.commit' },
  },
  order: {
    health: { cmd: 'order.health' },
    prepare: { cmd: 'order.prepare' },
    paymentContext: { cmd: 'order.payment-context' },
    getById: { cmd: 'order.get-by-id' },
  },
  payment: {
    health: { cmd: 'payment.health' },
    createIntent: { cmd: 'payment.create-intent' },
    refund: { cmd: 'payment.refund' },
  },
  promotion: {
    health: { cmd: 'promotion.health' },
    preview: { cmd: 'promotion.preview' },
    redeem: { cmd: 'promotion.redeem' },
  },
  notification: {
    health: { cmd: 'notification.health' },
  },
} as const;

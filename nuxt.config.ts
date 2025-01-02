// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@sidebase/nuxt-auth'],

  runtimeConfig: {
    authSecret: process.env.AUTH_SECRET,
    // APIRouteSecret: process.env.API_ROUTE_SECRET,
    public: {
      baseURL: process.env.BASE_URL || `http://localhost:${process.env.PORT}`
    }
  },

  auth: {
    baseURL: process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/auth`
      : `http://localhost:${process.env.PORT}/api/auth`,
    provider: {
      type: 'authjs',
    }
  }
})
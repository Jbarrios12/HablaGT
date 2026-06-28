import { api } from "../lib/api";
import { tokenStorage } from "../lib/tokenStorage";

export const authService = {
  async login(usuario, password) {
    const { data } = await api.post("/auth/login", { usuario, password });
    return data;
  },
  async verify2FA(challengeToken, code) {
    const { data } = await api.post("/auth/2fa/verify", {
      challenge_token: challengeToken,
      code,
    });
    return data;
  },
  async logout(refreshToken) {
    await api.post("/auth/logout", { refresh_token: refreshToken });
  },
  async me() {
    const { data } = await api.get("/auth/me");
    return data;
  },
  async get2FAStatus() {
    const { data } = await api.get("/auth/2fa");
    return data;
  },
  async enable2FA() {
    const { data } = await api.post("/auth/2fa/enable");
    return data;
  },
  async confirm2FA(code) {
    const { data } = await api.post("/auth/2fa/confirm", { code });
    return data;
  },
  async disable2FA(password) {
    await api.post("/auth/2fa/disable", { password });
  },
  async forgotPassword(email) {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },
  async resetPassword(token, newPassword) {
    const { data } = await api.post("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    return data;
  },
  persistSession(loginResponse) {
    if (loginResponse.access_token) {
      tokenStorage.setTokens(loginResponse.access_token, loginResponse.refresh_token);
    }
    if (loginResponse.user) {
      tokenStorage.setUser({
        id: loginResponse.user.id,
        email: loginResponse.user.email,
        nombre: loginResponse.user.full_name || loginResponse.user.fullName,
        rol: loginResponse.user.role,
        tenant: loginResponse.user.tenant,
        extension: loginResponse.user.extension,
      });
    }
  },
};

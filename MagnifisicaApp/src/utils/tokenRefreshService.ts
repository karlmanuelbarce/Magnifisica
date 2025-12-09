import { getAuth } from "@react-native-firebase/auth";

import { useAuthStore } from "../store/authstore";

const auth = getAuth();

class TokenRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null;

  startAutoRefresh() {
    if (this.refreshInterval) {
      this.stopAutoRefresh();
    }

    // Refresh every 50 minutes (10 min before expiry)
    this.refreshInterval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          console.log("🔄 Auto-refreshing token...");
          await user.getIdToken(true);

          // Re-check admin role
          const tokenResult = await user.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;
          useAuthStore.setState({ isAdmin });

          console.log("✅ Token refreshed");
        } catch (error) {
          console.error("❌ Auto-refresh failed:", error);
        }
      }
    }, 50 * 60 * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export const tokenRefreshService = new TokenRefreshService();

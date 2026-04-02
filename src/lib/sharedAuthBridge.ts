import { supabase } from '@/lib/supabase';

const SHARED_AUTH_BRIDGE_KEY = 'shared-auth';

function clearBridgeHash() {
  const currentUrl = new URL(window.location.href);
  currentUrl.hash = '';
  window.history.replaceState({}, document.title, currentUrl.toString());
}

export async function applySharedAuthBridgeFromUrl() {
  if (typeof window === 'undefined') {
    return false;
  }

  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';

  if (!rawHash) {
    return false;
  }

  const bridgeParams = new URLSearchParams(rawHash);

  if (bridgeParams.get('bridge') !== SHARED_AUTH_BRIDGE_KEY) {
    return false;
  }

  const accessToken = bridgeParams.get('access_token');
  const refreshToken = bridgeParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    console.warn('Shared auth bridge payload is missing required session tokens.');
    clearBridgeHash();
    return false;
  }

  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('Shared auth bridge failed to set Supabase session:', error);
      return false;
    }

    const locationId = bridgeParams.get('location_id');
    const orgId = bridgeParams.get('org_id');

    if (locationId) {
      localStorage.setItem('cobalt_current_location', locationId);
    }

    if (orgId) {
      localStorage.setItem('cobalt_shared_org_id', orgId);
    }

    sessionStorage.setItem('cobalt_shared_auth_bridge_applied_at', new Date().toISOString());

    return true;
  } finally {
    clearBridgeHash();
  }
}

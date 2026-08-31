import React, { useState, useEffect, Component, ReactNode } from 'react';
import {
  AdPlacement,
  AdVariant,
  ActiveTab,
  MonetizationConfig,
  DirectSponsorItem,
} from '../../types';
import {
  getCachedMonetizationConfig,
  apiGetMonetizationConfig,
  shouldShowAdSlot,
  HOUSE_ADS,
} from '../../utils/monetization';
import { HouseAd } from './HouseAd';
import { SponsoredCard } from './SponsoredCard';

interface AdSlotProps {
  placement: AdPlacement;
  variant?: AdVariant;
  className?: string;
  onNavigateTab?: (tab: ActiveTab) => void;
  customHouseAdIndex?: number;
  fallbackToHouseAd?: boolean;
}

// Internal Error Boundary to guarantee ads NEVER crash the parent page
class AdErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('Ad slot safely handled an internal rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

export const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  variant = 'Native',
  className = '',
  onNavigateTab,
  customHouseAdIndex,
  fallbackToHouseAd = true,
}) => {
  const [config, setConfig] = useState<MonetizationConfig>(getCachedMonetizationConfig);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<boolean>(false);

  // Sync window resize for mobile density logic
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync config from backend and event listener
  useEffect(() => {
    let isMounted = true;
    apiGetMonetizationConfig().then((res) => {
      if (isMounted && res.success && res.config) {
        setConfig(res.config);
      }
    });

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ config: MonetizationConfig }>;
      if (customEvent.detail?.config) {
        setConfig(customEvent.detail.config);
      }
    };

    window.addEventListener('valuenet:monetization-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('valuenet:monetization-updated', handleUpdate);
    };
  }, []);

  // Determine whether this ad slot should be visible
  const isVisible = shouldShowAdSlot(config, placement, isMobile);
  if (!isVisible || config.provider === 'none') {
    return null;
  }

  // Pick deterministic house ad based on placement or prop
  const getHouseAdItem = () => {
    if (customHouseAdIndex !== undefined && HOUSE_ADS[customHouseAdIndex]) {
      return HOUSE_ADS[customHouseAdIndex];
    }
    // Deterministic selection based on placement hash
    let hash = 0;
    for (let i = 0; i < placement.length; i++) {
      hash = (hash + placement.charCodeAt(i)) % HOUSE_ADS.length;
    }
    return HOUSE_ADS[hash] || HOUSE_ADS[0];
  };

  // Find active direct sponsor if provider is direct_sponsor
  const getDirectSponsor = (): DirectSponsorItem | null => {
    if (!config.directSponsors || config.directSponsors.length === 0) return null;
    const active = config.directSponsors.filter(
      (s) => s.status === 'APPROVED' && (!s.endDate || s.endDate > Date.now())
    );
    if (active.length === 0) return null;
    // Simple deterministic index
    let hash = 0;
    for (let i = 0; i < placement.length; i++) {
      hash = (hash + placement.charCodeAt(i)) % active.length;
    }
    return active[hash];
  };

  // Minimum dimensions reservation for zero Cumulative Layout Shift (CLS)
  const getMinHeightClass = () => {
    switch (variant) {
      case 'Banner':
        return 'min-h-[88px] sm:min-h-[92px]';
      case 'Sidebar':
        return 'min-h-[220px]';
      case 'InFeed':
      case 'Native':
      case 'Rectangle':
      default:
        return 'min-h-[160px]';
    }
  };

  const houseAd = getHouseAdItem();
  const directSponsor = getDirectSponsor();

  return (
    <AdErrorBoundary
      fallback={
        fallbackToHouseAd ? (
          <div className={`w-full ${getMinHeightClass()} ${className}`}>
            <HouseAd
              ad={houseAd}
              variant={variant}
              onNavigateTab={onNavigateTab}
            />
          </div>
        ) : null
      }
    >
      <div
        id={`ad-slot-${placement}`}
        data-placement={placement}
        data-variant={variant}
        className={`w-full ${getMinHeightClass()} ${className}`}
      >
        {/* 1. Direct Sponsor Mode */}
        {config.provider === 'direct_sponsor' && directSponsor && (
          <SponsoredCard sponsor={directSponsor} variant={variant} />
        )}

        {/* 2. Display Ads Network Mode (Sandboxed, failure-safe container) */}
        {config.provider === 'display_network' && !scriptError && (
          <div className="w-full rounded-2xl bg-[#080b1a] border border-slate-800/80 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                ADVERTISEMENT
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                VALUE.NET NETWORK
              </span>
            </div>

            {/* Display Network Placement Container */}
            <div className="w-full flex items-center justify-center min-h-[90px] py-2">
              {/* Fallback to clean house ad if no third-party tags are injected */}
              <div className="w-full">
                <HouseAd
                  ad={houseAd}
                  variant={variant}
                  onNavigateTab={onNavigateTab}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. House Ad Mode or Fallback */}
        {(config.provider === 'house_ad' ||
          (config.provider === 'direct_sponsor' && !directSponsor) ||
          (config.provider === 'display_network' && scriptError)) && (
          <HouseAd
            ad={houseAd}
            variant={variant}
            onNavigateTab={onNavigateTab}
          />
        )}
      </div>
    </AdErrorBoundary>
  );
};

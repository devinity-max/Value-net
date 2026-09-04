import React, { useState, useMemo, useEffect } from 'react';
import { Fruit, ActiveTab, LedgerEntry, AuthUser, TradeAd } from './types';
import { INITIAL_LEDGER } from './data/fruits';
import { calculateTrade, formatMoney } from './utils/calc';
import { Navbar } from './components/Navbar';
import { FruitSlot } from './components/FruitSlot';
import { VerdictDisplay, MobileTradeIndicator, MobileTacticalVerdict } from './components/VerdictDisplay';
import { FruitSelectorModal } from './components/FruitSelectorModal';
import { RecentLedger } from './components/RecentLedger';
import { ValuesView } from './components/ValuesView';
import { LiveTradesView } from './components/LiveTradesView';
import { WikiView } from './components/WikiView';
import { Footer } from './components/Footer';
import { ApiModal } from './components/ApiModal';
import { AuthModal } from './components/AuthModal';
import { PlayerProfileView } from './components/PlayerProfileView';
import { EditProfileView } from './components/EditProfileView';
import { GiveawaysView } from './components/GiveawaysView';
import { OwnerControlView } from './components/OwnerControlView';
import { ModerationCenterView } from './components/ModerationCenterView';
import { HostDashboardView } from './components/HostDashboardView';
import { FruitCatalogAdminView } from './components/FruitCatalogAdminView';
import { MonetizationAdminView } from './components/MonetizationAdminView';
import { TermsView } from './components/TermsView';
import { PrivacyView } from './components/PrivacyView';
import { GuidelinesView } from './components/GuidelinesView';
import { SafetyView } from './components/SafetyView';
import { ContactView } from './components/ContactView';
import { SecurityView } from './components/SecurityView';
import { AdvertiseView } from './components/AdvertiseView';
import { SupportView } from './components/SupportView';
import { NotFoundView } from './components/NotFoundView';
import { CommunityView } from './components/CommunityView';
import { FoundersSection } from './components/brand/FoundersSection';
import { DiscordCommunityCard } from './components/brand/DiscordCommunityCard';
import { BrandHeroShowcase } from './components/brand/BrandHeroShowcase';
import { BRAND_CONFIG } from './data/brand';
import { getDiscordUrl } from './utils/brandSettings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getStoredUser, apiGetMe, apiLogout } from './utils/auth';
import { apiGetSystemHealth, SystemHealthMetrics } from './utils/systemStatus';
import { AdSlot } from './components/ads/AdSlot';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string>('Vortex_Samurai');
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Poll system health with safe interval
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      const res = await apiGetSystemHealth();
      if (isMounted && res.success && res.health) {
        setSystemHealth(res.health);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Trade Slots (4 slots each)
  const [yourSlots, setYourSlots] = useState<(Fruit | null)[]>([null, null, null, null]);
  const [theirSlots, setTheirSlots] = useState<(Fruit | null)[]>([null, null, null, null]);

  // Modal State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorTarget, setSelectorTarget] = useState<{
    side: 'your' | 'their';
    index: number;
  }>({ side: 'your', index: 0 });

  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [discordUrl, setDiscordUrl] = useState<string>(() => getDiscordUrl());

  // Sync / refresh session on mount
  useEffect(() => {
    const handleDiscordUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      if (customEvent.detail?.url) {
        setDiscordUrl(customEvent.detail.url);
      } else {
        setDiscordUrl(getDiscordUrl());
      }
    };
    window.addEventListener('valuenet:discord-updated', handleDiscordUpdate);
    return () => window.removeEventListener('valuenet:discord-updated', handleDiscordUpdate);
  }, []);

  useEffect(() => {
    const syncUser = async () => {
      const me = await apiGetMe();
      if (me) {
        setCurrentUser(me);
        setViewingProfileUsername(me.username);
      }
    };
    syncUser();

    // Handle PKCE Authorization Code Exchange (e.g. ?code=... returning from email confirmation link)
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    if (authCode) {
      supabase.auth.exchangeCodeForSession(authCode).then(({ data, error }) => {
        if (!error && data?.session) {
          showToast('✅ Email confirmed successfully! Welcome to VALUE.NET.', 'success');
          apiGetMe().then((me) => {
            if (me) {
              setCurrentUser(me);
              setViewingProfileUsername(me.username);
            }
          });
        } else if (error) {
          console.warn('Code exchange failed:', error.message);
          showToast(`⚠️ Confirmation Error: ${error.message}`, 'error');
        }
        window.history.replaceState(null, '', window.location.pathname);
      }).catch((err) => {
        console.warn('Code exchange catch:', err);
      });
    }

    // Subscribe to Supabase auth events (e.g. returning from email confirmation or password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const me = await apiGetMe();
        if (me) {
          setCurrentUser(me);
          setViewingProfileUsername(me.username);
        }
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (window.location.search.includes('auth=confirmed') || window.location.hash.includes('type=signup')) {
            showToast('✅ Email confirmed successfully! Welcome to VALUE.NET.', 'success');
            window.history.replaceState(null, '', window.location.pathname);
          } else if (window.location.search.includes('auth=recovery') || window.location.hash.includes('type=recovery')) {
            showToast('🔑 Account recovery verified! You can now update your password in Settings.', 'info');
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    // Handle authentication error hashes (e.g. expired confirmation links)
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('error=') || search.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', '?') || search);
      const errCode = params.get('error_code') || params.get('error');
      const errDesc = params.get('error_description')?.replace(/\+/g, ' ') || 'Authentication link failed or expired.';

      if (errCode === 'otp_expired' || errDesc.toLowerCase().includes('expired')) {
        showToast('⚠️ Email confirmation link has expired. Please sign in or request a new one.', 'error');
      } else if (errCode === 'access_denied' || errDesc.toLowerCase().includes('invalid')) {
        showToast('⚠️ Confirmation link is invalid or already used. Please sign in.', 'error');
      } else {
        showToast(`⚠️ Auth Error: ${errDesc}`, 'error');
      }
      window.history.replaceState(null, '', window.location.pathname);
    } else if (search.includes('auth=confirmed') && !hash && !authCode) {
      showToast('✅ Email confirmed! Please sign in to continue.', 'success');
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Check URL parameters for tab routing
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ActiveTab | null;
      const userParam = params.get('user');

      if (tabParam && ['calculator', 'live-trades', 'giveaways', 'values', 'wiki', 'community', 'profile', 'edit-profile', 'terms', 'privacy', 'guidelines', 'safety', 'contact', 'security'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
      if (userParam) {
        setViewingProfileUsername(userParam);
      }
    } catch (e) {}

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => INITIAL_LEDGER);

  // Calculate live verdict
  const analysis = useMemo(() => {
    return calculateTrade(yourSlots, theirSlots);
  }, [yourSlots, theirSlots]);

  // Slot Management
  const handleOpenSelector = (side: 'your' | 'their', index: number) => {
    setSelectorTarget({ side, index });
    setIsSelectorOpen(true);
  };

  const handleSelectFruit = (fruit: Fruit) => {
    if (selectorTarget.side === 'your') {
      const next = [...yourSlots];
      next[selectorTarget.index] = fruit;
      setYourSlots(next);
    } else {
      const next = [...theirSlots];
      next[selectorTarget.index] = fruit;
      setTheirSlots(next);
    }
  };

  const handleClearSlot = (side: 'your' | 'their', index: number) => {
    if (side === 'your') {
      const next = [...yourSlots];
      next[index] = null;
      setYourSlots(next);
    } else {
      const next = [...theirSlots];
      next[index] = null;
      setTheirSlots(next);
    }
  };

  const handleClearAll = () => {
    setYourSlots([null, null, null, null]);
    setTheirSlots([null, null, null, null]);
  };

  const handleSwapSides = () => {
    const tempYour = [...yourSlots];
    setYourSlots([...theirSlots]);
    setTheirSlots(tempYour);
  };

  // Log Trade to Ledger
  const handleLogTrade = () => {
    const activeYour = yourSlots.filter((f): f is Fruit => f !== null);
    const activeTheir = theirSlots.filter((f): f is Fruit => f !== null);

    if (activeYour.length === 0 || activeTheir.length === 0) return;

    const newEntry: LedgerEntry = {
      id: `tx-${Date.now().toString().slice(-4)}`,
      timestamp: Date.now(),
      yourFruits: activeYour,
      theirFruits: activeTheir,
      yourMarketValue: analysis.yourMarketValue,
      theirMarketValue: analysis.theirMarketValue,
      diff: analysis.diff,
      grade: analysis.grade,
      title: `${analysis.title} (${analysis.percentageDiff >= 0 ? '+' : ''}${analysis.percentageDiff.toFixed(1)}%)`,
    };

    setLedgerEntries((prev) => [newEntry, ...prev]);
  };

  // Load a trade from Ledger or Live Trades into Calculator
  const handleLoadTrade = (your: Fruit[], their: Fruit[]) => {
    const newYour: (Fruit | null)[] = [null, null, null, null];
    const newTheir: (Fruit | null)[] = [null, null, null, null];

    your.slice(0, 4).forEach((f, i) => {
      newYour[i] = f;
    });
    their.slice(0, 4).forEach((f, i) => {
      newTheir[i] = f;
    });

    setYourSlots(newYour);
    setTheirSlots(newTheir);
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add fruit from Values tab
  const handleAddFruitFromValues = (fruit: Fruit, side: 'your' | 'their') => {
    const slots = side === 'your' ? yourSlots : theirSlots;
    const firstEmpty = slots.findIndex((f) => f === null);

    if (firstEmpty !== -1) {
      if (side === 'your') {
        const next = [...yourSlots];
        next[firstEmpty] = fruit;
        setYourSlots(next);
      } else {
        const next = [...theirSlots];
        next[firstEmpty] = fruit;
        setTheirSlots(next);
      }
    } else {
      if (side === 'your') {
        const next = [...yourSlots];
        next[0] = fruit;
        setYourSlots(next);
      } else {
        const next = [...theirSlots];
        next[0] = fruit;
        setTheirSlots(next);
      }
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToLedger = () => {
    setActiveTab('calculator');
    setTimeout(() => {
      const el = document.getElementById('ledger-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleViewTraderProfile = (username: string) => {
    setViewingProfileUsername(username);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewMyProfile = () => {
    if (currentUser) {
      setViewingProfileUsername(currentUser.username);
      setActiveTab('profile');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setViewingProfileUsername(user.username);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#070913] text-slate-100 font-sans selection:bg-purple-600 selection:text-white">
      {/* Global Background Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-purple-700/20 via-indigo-600/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[35%] -left-[10%] w-[500px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-[60%] -right-[10%] w-[500px] h-[500px] bg-purple-600/10 blur-[140px] rounded-full pointer-events-none" />
      </div>

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLedger={handleScrollToLedger}
        onOpenApi={() => setIsApiModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewMyProfile={handleViewMyProfile}
      />

      {/* System Survival / Emergency Protection Banner */}
      {(systemHealth?.loadState === 'CRITICAL' || systemHealth?.isEmergencyMode) && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-gradient-to-r from-amber-950/90 via-rose-950/90 to-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-center backdrop-blur-md shadow-lg">
          <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-2.5 text-xs font-game font-bold text-amber-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-amber-400 uppercase tracking-wider">PROTECTION MODE ACTIVE:</span>
            <span>
              {systemHealth?.emergencyReason || 'High platform traffic detected. Instant calculations and live trade execution remain fully active.'}
            </span>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="flex-grow relative z-10">
        {/* 1. CALCULATOR VIEW */}
        {activeTab === 'calculator' && (
          <ErrorBoundary moduleName="Calculator Engine">
            <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1240px] mx-auto w-full flex flex-col items-center animate-in fade-in duration-300">
              {/* Game Hero Section with 3D Shield Crest and Video Showcase */}
              <BrandHeroShowcase
                className="mb-8 w-full"
                onExploreTrades={() => setActiveTab('live-trades')}
                onOpenCalculator={() => setActiveTab('calculator')}
              />

              {/* Game Terminal 3-Column Grid */}
              <div className="game-panel p-3.5 sm:p-6 md:p-8 w-full relative box-border">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 w-full items-stretch">
                  {/* Left Column: YOUR OFFER (Side A) */}
                  <div className="lg:col-span-4 flex flex-col justify-between bg-[#0e1224]/80 p-3.5 sm:p-5 rounded-2xl border border-purple-500/20 shadow-inner box-border">
                    <div className="flex items-center justify-between mb-3 sm:mb-5 pb-2.5 sm:pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-purple-300 text-sm">person</span>
                        </div>
                        <span className="font-game font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
                          YOUR OFFER
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                        SIDE A
                      </span>
                    </div>

                    <div className="flex flex-col flex-grow justify-between">
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mb-3 sm:mb-5">
                        {yourSlots.map((fruit, idx) => (
                          <FruitSlot
                            key={`your-slot-${idx}`}
                            fruit={fruit}
                            index={idx}
                            side="your"
                            onOpenSelector={() => handleOpenSelector('your', idx)}
                            onClear={() => handleClearSlot('your', idx)}
                          />
                        ))}
                      </div>

                      {/* Total Value Footer for Your Offer */}
                      <div className="flex justify-between items-center bg-[#0a0d1a] p-3 sm:p-3.5 rounded-xl border border-slate-800 mt-auto">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          TOTAL VALUE
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base sm:text-xl font-black font-game text-emerald-400 tracking-wide">
                            ${formatMoney(analysis.yourMarketValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE-ONLY: VALUE INDICATOR & TRADE STATUS CONNECTOR */}
                  <div className="lg:hidden w-full">
                    <MobileTradeIndicator
                      analysis={analysis}
                      onSwapSides={handleSwapSides}
                    />
                  </div>

                  {/* DESKTOP-ONLY Center Column: ANALYSIS ENGINE */}
                  <div className="hidden lg:flex lg:col-span-4 flex-col justify-center px-0 my-0">
                    <VerdictDisplay
                      analysis={analysis}
                      yourSlots={yourSlots}
                      theirSlots={theirSlots}
                      onLogTrade={handleLogTrade}
                      onSwapSides={handleSwapSides}
                      onClearAll={handleClearAll}
                    />
                  </div>

                  {/* Right Column: THEIR OFFER (Side B) */}
                  <div className="lg:col-span-4 flex flex-col justify-between bg-[#0e1224]/80 p-3.5 sm:p-5 rounded-2xl border border-purple-500/20 shadow-inner box-border">
                    <div className="flex items-center justify-between mb-3 sm:mb-5 pb-2.5 sm:pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-amber-300 text-sm">swords</span>
                        </div>
                        <span className="font-game font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
                          THEIR OFFER
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                        SIDE B
                      </span>
                    </div>

                    <div className="flex flex-col flex-grow justify-between">
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mb-3 sm:mb-5">
                        {theirSlots.map((fruit, idx) => (
                          <FruitSlot
                            key={`their-slot-${idx}`}
                            fruit={fruit}
                            index={idx}
                            side="their"
                            onOpenSelector={() => handleOpenSelector('their', idx)}
                            onClear={() => handleClearSlot('their', idx)}
                          />
                        ))}
                      </div>

                      {/* Total Value Footer for Their Offer */}
                      <div className="flex justify-between items-center bg-[#0a0d1a] p-3 sm:p-3.5 rounded-xl border border-slate-800 mt-auto">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          TOTAL VALUE
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base sm:text-xl font-black font-game text-amber-400 tracking-wide">
                            ${formatMoney(analysis.theirMarketValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE-ONLY: TACTICAL ANALYSIS & ACTIONS BELOW BOTH SIDES */}
                  <div className="lg:hidden w-full">
                    <MobileTacticalVerdict
                      analysis={analysis}
                      hasItems={yourSlots.some((f) => f !== null) || theirSlots.some((f) => f !== null)}
                      onLogTrade={handleLogTrade}
                      onSwapSides={handleSwapSides}
                      onClearAll={handleClearAll}
                    />
                  </div>
                </div>
              </div>

              {/* AdSlot: Home Below Calculator Banner */}
              <div className="w-full mt-8">
                <AdSlot placement="home-below-calculator" variant="Banner" />
              </div>

              {/* Recent Ledger Section */}
              <div id="ledger-section" className="w-full mt-10">
                <RecentLedger
                  entries={ledgerEntries}
                  onLoadTrade={handleLoadTrade}
                  onDeleteEntry={(id) =>
                    setLedgerEntries((prev) => prev.filter((e) => e.id !== id))
                  }
                  onClearLedger={() => setLedgerEntries([])}
                />
              </div>

              {/* Community Integration Cards on Home */}
              <div className="w-full mt-16 space-y-16">
                <DiscordCommunityCard />
                <FoundersSection onViewProfile={handleViewTraderProfile} />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* 1.5. VALUE.NET COMMUNITY HUB VIEW */}
        {activeTab === 'community' && (
          <ErrorBoundary moduleName="Community Hub">
            <CommunityView
              onNavigateTab={setActiveTab}
              onViewTraderProfile={handleViewTraderProfile}
            />
          </ErrorBoundary>
        )}

        {/* 2. VALUES DATABASE VIEW */}
        {activeTab === 'values' && (
          <ErrorBoundary moduleName="Values Database">
            <ValuesView onAddFruitToCalc={handleAddFruitFromValues} />
          </ErrorBoundary>
        )}

        {/* 3. LIVE TRADES MARKETPLACE */}
        {activeTab === 'live-trades' && (
          <ErrorBoundary moduleName="Live Trades Marketplace">
            <LiveTradesView
              onLoadTrade={handleLoadTrade}
              onViewTraderProfile={handleViewTraderProfile}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          </ErrorBoundary>
        )}

        {/* 3.5. COMMUNITY GIVEAWAYS TERMINAL */}
        {activeTab === 'giveaways' && (
          <ErrorBoundary moduleName="Giveaways Terminal">
            <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
              <GiveawaysView
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onViewTraderProfile={handleViewTraderProfile}
                onShowToast={showToast}
                onNavigateToTab={setActiveTab}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* 3.6. CREATOR CONTROL CENTER / HOST DASHBOARD */}
        {(activeTab === 'host-giveaways' || activeTab === 'creator') && (
          <ErrorBoundary moduleName="Creator Dashboard">
            <HostDashboardView
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onViewTraderProfile={handleViewTraderProfile}
              onShowToast={showToast}
              onNavigateToTab={setActiveTab}
            />
          </ErrorBoundary>
        )}

        {/* 3.7. DEDICATED MODERATION CONTROL CENTER */}
        {activeTab === 'moderation' && (
          <ErrorBoundary moduleName="Moderation Center">
            <ModerationCenterView
              currentUser={currentUser}
              onViewTraderProfile={handleViewTraderProfile}
              onNavigateToTab={setActiveTab}
              onShowToast={showToast}
            />
          </ErrorBoundary>
        )}

        {/* 3.8. ADMIN & OWNER CONTROL CENTER */}
        {(activeTab === 'owner-control' || activeTab === 'admin' || activeTab === 'admin-moderation') && (
          <ErrorBoundary moduleName="Admin Control Center">
            <OwnerControlView
              currentUser={currentUser}
              onViewTraderProfile={handleViewTraderProfile}
              onNavigateToTab={setActiveTab}
              onShowToast={showToast}
            />
          </ErrorBoundary>
        )}

        {/* 3.8. DEDICATED FRUIT CATALOG ADMIN PANEL */}
        {activeTab === 'fruit-catalog-admin' && (
          <ErrorBoundary moduleName="Fruit Catalog Admin">
            <div className="pt-20">
              <FruitCatalogAdminView
                currentUser={currentUser}
                onNavigateTab={setActiveTab}
                onShowAuthModal={() => setIsAuthModalOpen(true)}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* 3.9. MONETIZATION & ADS ADMIN CONTROL */}
        {activeTab === 'monetization-admin' && (
          <ErrorBoundary moduleName="Monetization Admin">
            <div className="pt-20">
              <MonetizationAdminView
                currentUser={currentUser}
                onShowToast={showToast}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* 4. PLAYER TERMINAL PROFILE VIEW */}
        {activeTab === 'profile' && (
          <ErrorBoundary moduleName="Player Profile">
            <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
              <PlayerProfileView
                username={viewingProfileUsername}
                onEditProfile={() => setActiveTab('edit-profile')}
                onInspectTrade={(trade: TradeAd) => {
                  setActiveTab('live-trades');
                }}
                onLoginClick={() => setIsAuthModalOpen(true)}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* 5. EDIT PROFILE VIEW */}
        {activeTab === 'edit-profile' && (
          <ErrorBoundary moduleName="Edit Profile">
            <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
              <EditProfileView
                onSaveComplete={(updated) => {
                  setViewingProfileUsername(updated.username);
                  setActiveTab('profile');
                }}
                onCancel={() => setActiveTab('profile')}
                onLoginRequired={() => setIsAuthModalOpen(true)}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* 6. WIKI VIEW */}
        {activeTab === 'wiki' && (
          <ErrorBoundary moduleName="Wiki & Guides">
            <WikiView />
          </ErrorBoundary>
        )}

        {/* 7. TERMS OF SERVICE */}
        {activeTab === 'terms' && (
          <ErrorBoundary moduleName="Terms of Service">
            <TermsView onNavigateTab={setActiveTab} />
          </ErrorBoundary>
        )}

        {/* 8. PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <ErrorBoundary moduleName="Privacy Policy">
            <PrivacyView onNavigateTab={setActiveTab} />
          </ErrorBoundary>
        )}

        {/* 9. COMMUNITY GUIDELINES */}
        {activeTab === 'guidelines' && (
          <ErrorBoundary moduleName="Community Guidelines">
            <GuidelinesView onNavigateTab={setActiveTab} />
          </ErrorBoundary>
        )}

        {/* 10. SAFETY CENTER */}
        {activeTab === 'safety' && (
          <ErrorBoundary moduleName="Safety Center">
            <SafetyView
              onNavigateTab={setActiveTab}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onShowToast={showToast}
            />
          </ErrorBoundary>
        )}

        {/* 11. CONTACT & HELP DESK */}
        {activeTab === 'contact' && (
          <ErrorBoundary moduleName="Contact Support">
            <ContactView
              onNavigateTab={setActiveTab}
              onShowToast={showToast}
            />
          </ErrorBoundary>
        )}

        {/* 12. SECURITY & DISCLOSURE */}
        {activeTab === 'security' && (
          <ErrorBoundary moduleName="Security Disclosure">
            <SecurityView onNavigateTab={setActiveTab} />
          </ErrorBoundary>
        )}

        {/* 13. ADVERTISE WITH US */}
        {activeTab === 'advertise' && (
          <ErrorBoundary moduleName="Advertise With Us">
            <AdvertiseView
              currentUser={currentUser}
              onNavigateTab={setActiveTab}
              onShowToast={showToast}
            />
          </ErrorBoundary>
        )}

        {/* 14. SUPPORT PLATFORM */}
        {activeTab === 'support' && (
          <ErrorBoundary moduleName="Support Platform">
            <SupportView
              currentUser={currentUser}
              onNavigateTab={setActiveTab}
              onShowToast={showToast}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Asset Selector Modal */}
      <FruitSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectFruit={handleSelectFruit}
        targetSide={selectorTarget.side}
        targetSlotIndex={selectorTarget.index}
      />

      {/* API Schema Modal */}
      <ApiModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div
          id="global-toast"
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl font-game text-xs sm:text-sm font-bold border-2 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur-xl animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/60 text-rose-300 shadow-rose-500/20'
              : 'bg-[#12162d]/90 border-purple-500/50 text-slate-100 shadow-purple-500/20'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Footer */}
      <Footer
        onNavigateTab={setActiveTab}
        onOpenLedger={handleScrollToLedger}
        onOpenApi={() => setIsApiModalOpen(true)}
        onScrollToTop={handleScrollToTop}
      />
    </div>
  );
}

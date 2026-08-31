import React, { useState, useEffect } from 'react';
import { ActiveTab, AuthUser } from '../types';
import { getSoundEnabled, toggleSound, playClickSound } from '../utils/audio';
import { getRoleBadgeInfo, hasPermission } from '../utils/permissions';
import { BrandLogo } from './brand/BrandLogo';
import { BRAND_CONFIG } from '../data/brand';
import { getDiscordUrl } from '../utils/brandSettings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenLedger: () => void;
  onOpenApi: () => void;
  onOpenAuth: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onViewMyProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLedger,
  onOpenApi,
  onOpenAuth,
  currentUser,
  onLogout,
  onViewMyProfile,
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userRole = currentUser?.role || currentUser?.profile?.role;
  const isOwner = userRole === 'ROOT_OWNER' || (currentUser?.email || '').trim().toLowerCase() === 'dmg73364@gmail.com';
  const isAdmin = userRole === 'ADMIN';
  const isModerator = userRole === 'MODERATOR';
  const isCatalogAdmin = isOwner || isAdmin || isModerator || (currentUser && hasPermission(currentUser, 'ACCESS_CATALOG_ADMIN'));
  const isCreatorOrAbove = isOwner || isAdmin || (currentUser && hasPermission(currentUser, 'ACCESS_CREATOR_PANEL'));

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playClickSound();
    }
  };

  const handleTabClick = (tab: ActiveTab) => {
    playClickSound();
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const roleInfo = currentUser?.role ? getRoleBadgeInfo(currentUser.role) : null;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-[#090b16]/90 backdrop-blur-xl border-b border-[#7c3aed]/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center px-4 md:px-8 h-20 max-w-[1240px] mx-auto">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 rounded-xl bg-[#161b36] border border-[#7c3aed]/30 hover:border-[#a855f7] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
            <BrandLogo
              size="md"
              onClick={() => handleTabClick('calculator')}
            />
          </div>

          {/* Desktop Navigation Links (HUD Pill Style) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 bg-[#0e1224]/80 p-1.5 rounded-2xl border border-indigo-950/80 shadow-inner">
            <button
              onClick={() => handleTabClick('calculator')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] border border-purple-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="material-symbols-outlined text-base">calculate</span>
              CALCULATOR
            </button>

            <button
              onClick={() => handleTabClick('live-trades')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'live-trades'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] border border-purple-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="material-symbols-outlined text-base">storefront</span>
              TRADING
            </button>

            <button
              onClick={() => handleTabClick('giveaways')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 relative ${
                activeTab === 'giveaways'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-300/60 font-black'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
            >
              <span className="material-symbols-outlined text-base">featured_seasonal_and_gifts</span>
              DROPS
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-1"></span>
            </button>

            <button
              onClick={() => handleTabClick('values')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'values'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] border border-purple-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="material-symbols-outlined text-base">monitoring</span>
              VALUES
            </button>

            <button
              onClick={() => handleTabClick('community')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'community'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] border border-purple-400/50'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <span className="material-symbols-outlined text-base">groups</span>
              COMMUNITY
            </button>

            {/* Creator / Host Drops Tab */}
            {isCreatorOrAbove && (
              <button
                onClick={() => handleTabClick('host-giveaways')}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 border ${
                  activeTab === 'host-giveaways'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-500/20'
                    : 'text-amber-300/80 border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/40'
                }`}
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                HOST
              </button>
            )}

            {/* Fruit Catalog Admin Tab */}
            {isCatalogAdmin && (
              <button
                onClick={() => handleTabClick('fruit-catalog-admin')}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 border ${
                  activeTab === 'fruit-catalog-admin'
                    ? 'bg-indigo-600 text-white border-indigo-300 font-bold shadow-lg shadow-indigo-500/20'
                    : 'text-indigo-300 border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-950/40'
                }`}
              >
                <span className="material-symbols-outlined text-sm">database</span>
                CATALOG
              </button>
            )}

            {/* Root Owner / Admin Control Tab */}
            {(isOwner || isAdmin) && (
              <button
                onClick={() => handleTabClick('owner-control')}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 border ${
                  activeTab === 'owner-control' || activeTab === 'admin-moderation'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-300 font-black shadow-lg shadow-amber-500/30'
                    : isOwner
                    ? 'text-amber-300 border-amber-500/40 hover:bg-amber-950/50'
                    : 'text-rose-400 border-rose-500/40 hover:bg-rose-950/50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {isOwner ? 'crown' : 'shield_person'}
                </span>
                {isOwner ? 'OWNER' : 'ADMIN'}
              </button>
            )}
          </nav>

          {/* Right Action Icons & Login */}
          <div className="flex items-center gap-3">
            {/* Audio Toggle Button */}
            <button
              onClick={handleSoundToggle}
              title={soundOn ? 'Mute Audio Effects' : 'Enable Audio Effects'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                soundOn
                  ? 'bg-[#161b36] text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-[#0e1224] text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {soundOn ? 'volume_up' : 'volume_off'}
              </span>
            </button>

            {/* Auth State Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="nav-user-profile-button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`font-game text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all flex items-center gap-2.5 ${
                    isOwner
                      ? 'border-amber-500/60 bg-gradient-to-r from-amber-950/40 to-yellow-950/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isAdmin
                      ? 'border-rose-500/60 bg-rose-950/40 text-rose-300'
                      : activeTab === 'profile' || activeTab === 'edit-profile'
                      ? 'border-purple-500 bg-purple-950/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'border-slate-800 bg-[#161b36] text-slate-200 hover:border-purple-500/50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isOwner ? 'bg-amber-400 animate-ping' : isAdmin ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                  <span className="truncate max-w-[100px] sm:max-w-[130px]">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  <span className="material-symbols-outlined text-xs text-slate-400">
                    {userDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    id="nav-user-dropdown"
                    className="absolute right-0 mt-2 w-60 bg-[#0e1224] border border-purple-500/30 rounded-2xl shadow-2xl z-50 animate-fadeIn font-mono text-xs overflow-hidden"
                  >
                    <div className="p-3.5 border-b border-slate-800 bg-[#141830]">
                      <span className="block text-[9px] text-purple-300 font-bold tracking-widest uppercase">
                        TRADER PROFILE
                      </span>
                      <span className="block font-bold text-white text-sm truncate">
                        @{currentUser.username}
                      </span>
                      {roleInfo && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-1.5 space-y-1">
                      {/* Fruit Catalog Admin Access */}
                      {isCatalogAdmin && (
                        <button
                          onClick={() => {
                            handleTabClick('fruit-catalog-admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left text-amber-300 hover:bg-amber-950/40 flex items-center gap-2 transition-colors font-bold border border-amber-500/30"
                        >
                          <span className="material-symbols-outlined text-sm text-amber-400">database</span>
                          FRUIT CATALOG ADMIN
                        </button>
                      )}

                      {/* Root Owner: Dedicated access buttons */}
                      {isOwner ? (
                        <>
                          <button
                            onClick={() => {
                              handleTabClick('owner-control');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-amber-300 hover:bg-amber-950/50 flex items-center gap-2 transition-colors font-bold border border-amber-400/40"
                          >
                            <span className="material-symbols-outlined text-sm text-amber-400">crown</span>
                            OWNER CONTROL CENTER
                          </button>
                          <button
                            onClick={() => {
                              handleTabClick('admin-moderation');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 transition-colors font-semibold"
                          >
                            <span className="material-symbols-outlined text-sm text-rose-400">shield_person</span>
                            ADMIN PANEL
                          </button>
                          <button
                            onClick={() => {
                              handleTabClick('host-giveaways');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-amber-400 hover:bg-amber-950/40 flex items-center gap-2 transition-colors font-semibold"
                          >
                            <span className="material-symbols-outlined text-sm text-amber-400">verified</span>
                            HOST DROPS / CREATOR
                          </button>
                        </>
                      ) : isAdmin ? (
                        <>
                          <button
                            onClick={() => {
                              handleTabClick('admin-moderation');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 transition-colors font-bold border border-rose-500/40"
                          >
                            <span className="material-symbols-outlined text-sm text-rose-400">shield_person</span>
                            ADMIN PANEL
                          </button>
                          <button
                            onClick={() => {
                              handleTabClick('host-giveaways');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-amber-300/90 hover:bg-amber-950/30 flex items-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm text-amber-400">verified</span>
                            HOST DROPS
                          </button>
                        </>
                      ) : isCreatorOrAbove ? (
                        <button
                          onClick={() => {
                            handleTabClick('host-giveaways');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left text-amber-300 hover:bg-amber-950/30 flex items-center gap-2 transition-colors font-bold border border-amber-400/30"
                        >
                          <span className="material-symbols-outlined text-sm text-amber-400">verified</span>
                          HOST DROPS / CREATOR
                        </button>
                      ) : null}

                      <button
                        onClick={() => {
                          onViewMyProfile();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left text-slate-200 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors font-semibold"
                      >
                        <span className="material-symbols-outlined text-sm text-purple-400">
                          badge
                        </span>
                        MY PROFILE
                      </button>

                      <button
                        onClick={() => {
                          handleTabClick('edit-profile');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left text-slate-200 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm text-sky-400">
                          edit
                        </span>
                        EDIT PROFILE
                      </button>
                    </div>

                    <div className="p-1.5 border-t border-slate-800 bg-[#0a0d1a]">
                      <button
                        onClick={() => {
                          onLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors font-bold"
                      >
                        <span className="material-symbols-outlined text-sm">logout</span>
                        LOG OUT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="nav-login-button"
                onClick={onOpenAuth}
                className="game-btn-gold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>LOG IN</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 sm:px-6 py-4 sm:py-6 bg-[#0e1224] border-b border-purple-500/30 flex flex-col gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top duration-200 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto box-border custom-scrollbar">
            {(isOwner || isAdmin) && (
              <button
                onClick={() => handleTabClick('owner-control')}
                className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between text-amber-400 bg-amber-950/30 border border-amber-500/40 ${
                  activeTab === 'owner-control' ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    {isOwner ? 'crown' : 'shield_person'}
                  </span>
                  {isOwner ? '👑 OWNER CENTER' : '🛡️ ADMIN PANEL'}
                </span>
                {activeTab === 'owner-control' && <span>●</span>}
              </button>
            )}

            {isCreatorOrAbove && (
              <button
                onClick={() => handleTabClick('host-giveaways')}
                className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between text-amber-300 bg-amber-950/20 border border-amber-500/30 ${
                  activeTab === 'host-giveaways' ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  HOST REWARD DROPS
                </span>
                {activeTab === 'host-giveaways' && <span>●</span>}
              </button>
            )}

            <button
              onClick={() => handleTabClick('calculator')}
              className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between transition-all ${
                activeTab === 'calculator'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#161b36] text-slate-300 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">calculate</span>
                CALCULATOR
              </span>
              {activeTab === 'calculator' && <span>●</span>}
            </button>

            <button
              onClick={() => handleTabClick('live-trades')}
              className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between transition-all ${
                activeTab === 'live-trades'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#161b36] text-slate-300 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">storefront</span>
                LIVE TRADES
              </span>
              {activeTab === 'live-trades' && <span>●</span>}
            </button>

            <button
              onClick={() => handleTabClick('giveaways')}
              className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between transition-all ${
                activeTab === 'giveaways'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-[#161b36] text-amber-400 hover:text-amber-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">featured_seasonal_and_gifts</span>
                COMMUNITY GIVEAWAYS
              </span>
              {activeTab === 'giveaways' && <span>●</span>}
            </button>

            <button
              onClick={() => handleTabClick('values')}
              className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between transition-all ${
                activeTab === 'values'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#161b36] text-slate-300 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">monitoring</span>
                VALUES DATABASE
              </span>
              {activeTab === 'values' && <span>●</span>}
            </button>

            <button
              onClick={() => handleTabClick('community')}
              className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between transition-all ${
                activeTab === 'community'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#161b36] text-purple-300 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">groups</span>
                VALUE.NET COMMUNITY
              </span>
              {activeTab === 'community' && <span>●</span>}
            </button>

            <button
              onClick={() => handleTabClick('wiki')}
              className={`text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between transition-all ${
                activeTab === 'wiki'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#161b36] text-slate-300 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">menu_book</span>
                TRADING WIKI
              </span>
              {activeTab === 'wiki' && <span>●</span>}
            </button>

            {/* Direct Discord Mobile CTA */}
            <a
              href={getDiscordUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-left font-game font-bold text-xs p-3 rounded-xl uppercase flex items-center justify-between bg-[#5865F2] text-white shadow-md hover:bg-[#4752C4] transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">forum</span>
                JOIN DISCORD
              </span>
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </a>

            {currentUser ? (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                {isCatalogAdmin && (
                  <button
                    onClick={() => {
                      handleTabClick('fruit-catalog-admin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left font-mono text-xs py-2 text-amber-400 tracking-[0.2em] uppercase flex items-center gap-2 font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">database</span>
                    <span>FRUIT CATALOG ADMIN</span>
                  </button>
                )}
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => {
                      handleTabClick('owner-control');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left font-mono text-xs py-2 text-amber-300 tracking-[0.2em] uppercase flex items-center gap-2 font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">{isOwner ? 'crown' : 'shield_person'}</span>
                    <span>{isOwner ? 'OWNER CONTROL CENTER' : 'ADMIN PANEL'}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onViewMyProfile();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left font-game font-bold text-xs p-3 rounded-xl bg-[#161b36] text-emerald-400 uppercase flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">badge</span>
                  <span>MY PROFILE (@{currentUser.username})</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left font-game font-bold text-xs p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 uppercase flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span>LOG OUT</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="game-btn-gold w-full py-3 rounded-xl font-game font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 mt-2"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>LOG IN / SIGN UP</span>
              </button>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-between text-[10px] font-mono text-slate-400">
              <button onClick={onOpenLedger} className="hover:text-white uppercase">
                Trade Ledger
              </button>
              <button onClick={onOpenApi} className="hover:text-white uppercase">
                Terminal API
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

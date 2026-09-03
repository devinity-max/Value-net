import React, { useState } from 'react';
import { ActiveTab, AuthUser } from '../types';
import { BrandLogo } from './brand/BrandLogo';
import {
  isRootOwner,
  isAdmin,
  isModerator,
  isApprovedCreator,
  canAccessModeration,
  canAccessAdmin,
  canHostGiveaways,
} from '../utils/permissions';
import { getDiscordUrl } from '../utils/brandSettings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenLedger?: () => void;
  onOpenApi?: () => void;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const discordUrl = getDiscordUrl();

  const navLinks: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'calculator', label: 'Calculator', icon: 'calculate' },
    { id: 'values', label: 'Fruit Catalog', icon: 'grid_view' },
    { id: 'live-trades', label: 'Live Trades', icon: 'swap_horiz' },
    { id: 'giveaways', label: 'Giveaways', icon: 'featured_seasonal_and_gifts' },
    { id: 'wiki', label: 'Wiki', icon: 'menu_book' },
    { id: 'community', label: 'Community', icon: 'groups' },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setStaffDropdownOpen(false);
  };

  const showModeration = canAccessModeration(currentUser);
  const showAdmin = canAccessAdmin(currentUser);
  const showHost = canHostGiveaways(currentUser);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#070913]/90 border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <BrandLogo
          onClick={() => handleNavClick('calculator')}
          showSubtitle={true}
        />

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
                <span>{link.label}</span>
              </button>
            );
          })}

          {/* Dedicated Moderation Center Link */}
          {showModeration && (
            <button
              onClick={() => handleNavClick('moderation')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'moderation'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-md'
                  : 'text-indigo-400 hover:bg-indigo-950/40'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              <span>Moderation</span>
            </button>
          )}

          {/* Admin Control Suite Dropdown */}
          {showAdmin && (
            <div className="relative">
              <button
                onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                  ['owner-control', 'admin', 'fruit-catalog-admin', 'host-giveaways', 'monetization-admin'].includes(activeTab)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-amber-400 hover:bg-amber-950/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Admin Suite</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>

              {staffDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 rounded-2xl bg-[#0e1224] border border-slate-800 shadow-2xl p-2 backdrop-blur-xl z-50 flex flex-col gap-1">
                  <button
                    onClick={() => handleNavClick('admin')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-amber-400 text-sm">admin_panel_settings</span>
                    <span>Admin Control Center</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('fruit-catalog-admin')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-amber-400 text-sm">inventory_2</span>
                    <span>Fruit Catalog Admin</span>
                  </button>
                  {showHost && (
                    <button
                      onClick={() => handleNavClick('host-giveaways')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-emerald-400 text-sm">redeem</span>
                      <span>Host & Creator Drops</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleNavClick('monetization-admin')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-yellow-400 text-sm">monetization_on</span>
                    <span>Monetization Controls</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right Action Icons & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Official Discord Link */}
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono tracking-wider transition-all duration-200"
          >
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Discord</span>
          </a>

          {/* User Profile / Auth Toggle */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onViewMyProfile}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141830] hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-purple-400 text-base">
                  {currentUser.avatarUrl || 'person'}
                </span>
                <span className="text-xs font-bold font-mono text-slate-200 hidden sm:inline">
                  @{currentUser.username}
                </span>
              </button>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all cursor-pointer active:scale-95"
            >
              Log In / Register
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#070913] border-b border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider ${
                  activeTab === link.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">{link.icon}</span>
                <span>{link.label}</span>
              </button>
            ))}
          </div>

          {showModeration && (
            <button
              onClick={() => handleNavClick('moderation')}
              className="w-full flex items-center gap-2 p-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider bg-indigo-950/60 text-indigo-300 border border-indigo-500/40"
            >
              <span className="material-symbols-outlined text-base">gavel</span>
              <span>Moderation Center</span>
            </button>
          )}

          {showAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className="w-full flex items-center gap-2 p-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-500/40"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>Admin Control Center</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};

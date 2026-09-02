import React, { useState } from 'react';
import { ActiveTab, AuthUser } from '../types';
import { BrandLogo } from './brand/BrandLogo';
import { isRootOwner, isAdmin } from '../utils/permissions';
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
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
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
    setAdminDropdownOpen(false);
  };

  const isOwnerOrAdmin = currentUser && (isRootOwner(currentUser) || isAdmin(currentUser));

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

          {/* Admin Tools Dropdown */}
          {isOwnerOrAdmin && (
            <div className="relative">
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                  ['owner-control', 'fruit-catalog-admin', 'host-giveaways', 'monetization-admin'].includes(activeTab)
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-rose-400 hover:bg-rose-950/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Staff Suite</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>

              {adminDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl p-2 backdrop-blur-xl z-50 flex flex-col gap-1">
                  <button
                    onClick={() => handleNavClick('fruit-catalog-admin')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-amber-400 text-sm">inventory_2</span>
                    <span>Fruit Catalog Admin</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('owner-control')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-purple-400 text-sm">tune</span>
                    <span>Owner Control Deck</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('host-giveaways')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-emerald-400 text-sm">redeem</span>
                    <span>Host Giveaways</span>
                  </button>
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

          {/* Ledger Jump button */}
          {onOpenLedger && (
            <button
              onClick={onOpenLedger}
              title="Trade History Ledger"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">history_edu</span>
            </button>
          )}

          {/* API Info Modal */}
          {onOpenApi && (
            <button
              onClick={onOpenApi}
              title="API & Developers"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">code</span>
            </button>
          )}

          {/* User Profile / Auth Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onViewMyProfile}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 text-xs font-bold transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <span className="text-white font-mono hidden sm:inline">{currentUser.displayName || currentUser.username}</span>
              </button>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs font-mono tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              LOGIN / JOIN
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-slate-950/95 border-b border-slate-800 px-4 py-4 space-y-2 backdrop-blur-2xl animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900/80 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{link.icon}</span>
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          {isOwnerOrAdmin && (
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-rose-400 uppercase font-bold tracking-widest px-1">
                Admin Suite
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavClick('fruit-catalog-admin')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
                >
                  <span className="material-symbols-outlined text-amber-400 text-sm">inventory_2</span>
                  <span>Fruit Catalog</span>
                </button>
                <button
                  onClick={() => handleNavClick('owner-control')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
                >
                  <span className="material-symbols-outlined text-purple-400 text-sm">tune</span>
                  <span>Owner Deck</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

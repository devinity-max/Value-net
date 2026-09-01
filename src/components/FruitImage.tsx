import React, { useState } from 'react';
import { Fruit, FruitRarity } from '../types';
import { getFruitAsset } from '../utils/fruitAssetMapper';

export interface FruitImageProps {
  fruit?: Fruit | Partial<Fruit> | Record<string, any> | null;
  fruitId?: string;
  name?: string;
  imageUrl?: string;
  icon?: string;
  rarity?: FruitRarity | string;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;
  className?: string;
  showGlow?: boolean;
  alt?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  onClick?: (e: React.MouseEvent) => void;
}

const SIZE_MAP: Record<string, { container: string; icon: string; px: number }> = {
  '2xs': { container: 'w-4 h-4', icon: 'text-[10px]', px: 16 },
  xs: { container: 'w-6 h-6', icon: 'text-xs', px: 24 },
  sm: { container: 'w-8 h-8', icon: 'text-base', px: 32 },
  md: { container: 'w-10 h-10', icon: 'text-xl', px: 40 },
  lg: { container: 'w-14 h-14', icon: 'text-2xl', px: 56 },
  xl: { container: 'w-20 h-20', icon: 'text-3xl', px: 80 },
  '2xl': { container: 'w-24 h-24', icon: 'text-4xl', px: 96 },
  '3xl': { container: 'w-32 h-32', icon: 'text-5xl', px: 128 },
};

const ROUNDED_MAP: Record<string, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
  full: 'rounded-full',
};

export const FruitImage: React.FC<FruitImageProps> = ({
  fruit,
  fruitId,
  name,
  imageUrl,
  icon,
  rarity: propRarity,
  size = 'md',
  className = '',
  showGlow = false,
  alt,
  rounded = 'lg',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract relevant properties
  const fruitObj = (typeof fruit === 'object' && fruit !== null ? fruit : {}) as Record<string, any>;
  const targetId = fruitObj.id || fruitId || '';
  const targetName = fruitObj.name || fruitObj.fruitName || name || targetId;
  const targetRarity = (fruitObj.rarity || propRarity || 'Common') as FruitRarity;
  const explicitUrl = fruitObj.imageUrl || fruitObj.image_url || imageUrl;
  const targetIcon = fruitObj.icon || fruitObj.fruitIcon || icon;

  const asset = getFruitAsset(
    fruit
      ? { ...fruitObj, id: targetId, name: targetName, icon: targetIcon, rarity: targetRarity, imageUrl: explicitUrl }
      : { id: targetId, name: targetName, icon: targetIcon, rarity: targetRarity, imageUrl: explicitUrl }
  );

  // Size mapping
  const sizeConfig = typeof size === 'number'
    ? { container: '', icon: 'text-xl', px: size }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const customStyle: React.CSSProperties = typeof size === 'number'
    ? { width: `${size}px`, height: `${size}px` }
    : {};

  const roundedClass = ROUNDED_MAP[rounded] || 'rounded-xl';

  // The actual image source is the explicit URL or registered asset path
  const imageSource = !imgError ? (explicitUrl || asset.imageUrl) : undefined;

  const getRarityGlowClass = (rarity: string) => {
    switch (rarity) {
      case 'Mythical':
        return 'drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]';
      case 'Legendary':
        return 'drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]';
      case 'Rare':
        return 'drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]';
      case 'Gamepass':
        return 'drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]';
      default:
        return 'drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]';
    }
  };

  return (
    <div
      onClick={onClick}
      style={customStyle}
      className={`relative shrink-0 flex items-center justify-center select-none overflow-hidden ${sizeConfig.container} ${roundedClass} ${className} ${
        showGlow ? getRarityGlowClass(targetRarity) : ''
      }`}
    >
      {imageSource ? (
        <img
          src={imageSource}
          alt={alt || targetName || 'Fruit Artwork'}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110 pointer-events-none"
        />
      ) : (
        /* Clean, neutral UI placeholder — NO AI or synthetic artwork */
        <div
          className="w-full h-full flex flex-col items-center justify-center bg-[#101428] border border-slate-700/60 rounded-[inherit]"
          style={{ backgroundColor: `${asset.primaryColor}15` }}
          title={`${targetName} (Image unavailable)`}
        >
          <span
            className={`material-symbols-outlined ${sizeConfig.icon} opacity-80`}
            style={{ color: asset.primaryColor }}
          >
            {targetIcon || 'nutrition'}
          </span>
        </div>
      )}
    </div>
  );
};

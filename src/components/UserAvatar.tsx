import React from 'react';
import { Monitor, Smartphone, Globe } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  device?: 'desktop' | 'mobile' | 'web';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  alt = "Avatar", 
  status = 'offline', 
  device,
  size = 'md',
  className = ''
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const containerSizes = {
    sm: 'w-9 h-9',
    md: 'w-[44px] h-[44px]',
    lg: 'w-[52px] h-[52px]',
    xl: 'w-[68px] h-[68px]'
  };

  const imgSizes = sizeClasses[size];
  const wrapperSize = containerSizes[size];

  // Status Colors (Discord style)
  const statusColors = {
    online: 'border-green-500',
    idle: 'border-yellow-500',
    dnd: 'border-red-500',
    offline: 'border-gray-500'
  };

  const statusColorClass = statusColors[status] || statusColors.offline;

  // Device Icon Colors based on status
  const iconColors = {
    online: 'text-green-500',
    idle: 'text-yellow-500',
    dnd: 'text-red-500',
    offline: 'text-gray-500'
  };

  const iconColorClass = iconColors[status] || iconColors.offline;

  const renderDeviceIcon = () => {
    if (!device) return null;
    
    // Icon sizes based on avatar size
    const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;
    const bgSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';

    let Icon = Globe;
    if (device === 'desktop') Icon = Monitor;
    if (device === 'mobile') Icon = Smartphone;

    return (
      <div className={`absolute -bottom-1 -right-1 ${bgSize} bg-[#111116] rounded-full flex items-center justify-center z-10 border border-white/10`}>
        <Icon size={iconSize} className={iconColorClass} />
      </div>
    );
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Radial Status Wrapper */}
      <div className={`${wrapperSize} p-[2px] rounded-full border-2 ${statusColorClass} flex items-center justify-center transition-colors`}>
        <img 
          src={src || '/default-avatar.png'} 
          alt={alt} 
          className={`${imgSizes} rounded-full object-cover bg-black`} 
        />
      </div>
      {renderDeviceIcon()}
    </div>
  );
};

export default UserAvatar;

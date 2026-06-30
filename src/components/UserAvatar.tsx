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

  const imgSizes = sizeClasses[size];

  // Status Colors (Discord style)
  const statusColors = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-500' // Use grey for offline like discord
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

  const renderStatus = () => {
    const bgSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-4 h-4' : 'w-5 h-5';
    
    if (device) {
      const iconSize = size === 'sm' ? 8 : size === 'md' ? 10 : size === 'lg' ? 12 : 14;
      const deviceBgSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : size === 'lg' ? 'w-6 h-6' : 'w-7 h-7';
      let Icon = Globe;
      if (device === 'desktop') Icon = Monitor;
      if (device === 'mobile') Icon = Smartphone;

      return (
        <div className={`absolute -bottom-1 -right-1 ${deviceBgSize} bg-[#121218] rounded-full flex items-center justify-center z-10 border-2 border-[#121218]`}>
          <Icon size={iconSize} className={iconColorClass} />
        </div>
      );
    } else {
      // Just normal status dot
      return (
        <div className={`absolute -bottom-0.5 -right-0.5 ${bgSize} bg-[#121218] rounded-full flex items-center justify-center z-10`}>
          <div className={`w-full h-full rounded-full ${statusColorClass} border-2 border-[#121218]`}></div>
        </div>
      );
    }
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <img 
        src={src || '/default-avatar.png'} 
        alt={alt} 
        className={`${imgSizes} rounded-full object-cover bg-black`} 
      />
      {renderStatus()}
    </div>
  );
};

export default UserAvatar;

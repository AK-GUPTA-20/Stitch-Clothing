import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AdminLayout } from './AdminLayout';
import { 
  Settings, 
  Truck, 
  CreditCard, 
  Calculator, 
  Mail, 
  Star,
  MessageSquare,
  Box
} from 'lucide-react';

const tabs = [
  { name: 'General', href: '/admin/settings/general', icon: Settings },
  { name: 'Shipping', href: '/admin/settings/shipping', icon: Truck },
  { name: 'Payment', href: '/admin/settings/payment', icon: CreditCard },
  { name: 'Tax', href: '/admin/settings/tax', icon: Calculator },
  { name: 'Email', href: '/admin/settings/email', icon: Mail },
  { name: 'SMS', href: '/admin/settings/sms', icon: MessageSquare },
  { name: 'Loyalty', href: '/admin/settings/loyalty', icon: Star },
  { name: '3D Viewer', href: '/admin/settings/viewer3d', icon: Box },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function SettingsLayout({ children, title }: SettingsLayoutProps) {
  const router = useRouter();

  return (
    <AdminLayout title={`Settings - ${title}`}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="border-b border-stone-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => {
              const active = router.pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                    ${active 
                      ? 'border-stone-900 text-stone-900' 
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                    }
                  `}
                >
                  <tab.icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="pt-2">
          {children}
        </div>
      </div>
    </AdminLayout>
  );
}

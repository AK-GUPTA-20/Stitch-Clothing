import React from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useGetWallet } from '@/lib/hooks/useSeller';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingUp } from 'lucide-react';

/** Maps raw transaction source/type values to human-readable labels */
function formatTxSource(source?: string, paymentMethod?: string): string {
  if (!source && !paymentMethod) return 'Transaction';
  const s = (source || '').toLowerCase();
  const m = (paymentMethod || '').toLowerCase();

  if (s.includes('cod') || m === 'cod') return 'COD Delivery Credit';
  if (s.includes('online') || s.includes('razorpay') || s.includes('stripe') || s.includes('paypal')
      || m === 'razorpay' || m === 'stripe') return 'Online Order Credit';
  if (s.includes('order') || s.includes('sale')) return 'Order Credit';
  if (s.includes('payout') || s.includes('withdrawal')) return 'Payout';
  if (s.includes('refund')) return 'Refund';
  if (s.includes('adjustment') || s.includes('admin')) return 'Manual Adjustment';
  return source ? source.replace(/_/g, ' ') : 'Transaction';
}

export default function WalletPage() {
  const { data: wallet, isLoading } = useGetWallet();

  if (isLoading) return <SellerLayout title="Wallet & Earnings"><div>Loading...</div></SellerLayout>;

  const lifetimeEarnings = Number(wallet?.lifetimeEarnings || 0);

  return (
    <SellerLayout title="Wallet & Earnings" description="View your available balance and transaction history.">
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Available Balance */}
        <Card className="border-green-100 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-green-600" />
              <CardTitle className="text-sm font-medium text-green-800">Available Balance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              ${Number(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-green-700 mt-1">Ready for payout</p>
          </CardContent>
        </Card>

        {/* Lifetime Earnings */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-gray-500" />
              <CardTitle className="text-sm font-medium text-gray-500">Lifetime Earnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${lifetimeEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">All-time total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {wallet?.transactions && wallet.transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.transactions.map((txn: any) => (
                  <TableRow key={txn._id || `${txn.createdAt}-${txn.referenceId || txn.description}`}>
                    <TableCell>{new Date(txn.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${ 
                        txn.type === 'credit' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {formatTxSource(txn.source || txn.sourceType, txn.paymentMethod)}
                      </span>
                    </TableCell>
                    <TableCell className={txn.type === 'credit' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {txn.type === 'credit' ? '+' : '-'}${Math.abs(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className={`capitalize text-xs ${ 
                        txn.status === 'completed' ? 'text-green-600' :
                        txn.status === 'pending' ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {txn.status || 'settled'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No transactions found.</p>
          )}
        </CardContent>
      </Card>
    </SellerLayout>
  );
}

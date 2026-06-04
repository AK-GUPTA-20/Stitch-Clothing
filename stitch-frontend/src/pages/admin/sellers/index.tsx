import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { useAdminGetSellers } from '@/lib/hooks/useAdminSeller';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Shield, Users, ArrowRight } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminSellersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: sellers, isLoading } = useAdminGetSellers();

  if (authLoading || isLoading) return <div className="p-8">Loading...</div>;
  if (!user || user.role !== 'admin') return <div className="p-8">Access Denied</div>;

  return (
    <AdminLayout title="Sellers">
      <Head><title>Seller Management | Admin Dashboard</title></Head>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Sellers</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              {sellers && sellers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellers.map((seller: any) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium">{seller.businessName}</TableCell>
                        <TableCell>{seller.storeName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            seller.status === 'verified' ? 'bg-green-100 text-green-800' :
                            seller.status === 'suspended' ? 'bg-red-100 text-red-800' :
                            seller.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {seller.status || 'pending'}
                          </span>
                        </TableCell>
                        <TableCell>{seller.commissionRate || 10}%</TableCell>
                        <TableCell>{new Date(seller.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/sellers/${seller.id}`}>
                              View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No sellers found in the system.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </AdminLayout>
  );
}

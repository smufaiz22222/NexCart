import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Store, User, FileText } from 'lucide-react';
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore(); // Gets current user to know their role

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await apiClient.get('/orders');
                setOrders(response.data.orders);
            } catch (error) {
                console.error('Failed to load orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Handle updating the status
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            // 1. Tell the backend to update the database
            await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });

            // 2. Update the screen instantly without needing to refresh the page!
            setOrders(orders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update order status');
        }
    };

    // Helper to color-code order statuses
    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
            case 'PROCESSING': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center"><Package className="w-3 h-3 mr-1" /> Processing</span>;
            case 'COMPLETED': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    if (isLoading) return <div className="flex justify-center py-20 text-gray-500">Loading your orders...</div>;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {user?.role === 'WHOLESALER' ? 'Incoming Shop Orders' : 'My Purchase History'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {user?.role === 'WHOLESALER' ? 'Manage orders from your buyers.' : 'Track your marketplace orders.'}
                    </p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center">
                    <Package className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
                    <p className="text-gray-500 mt-1">When you make a transaction, it will appear here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                            {/* Order Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                                <div className="flex space-x-6">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Order Placed</p>
                                        <p className="text-sm font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</p>
                                        <p className="text-sm font-medium text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center">
                                            {user?.role === 'WHOLESALER' ? <><User className="w-3 h-3 mr-1" /> Buyer</> : <><Store className="w-3 h-3 mr-1" /> Sold By</>}
                                        </p>
                                        <p className="text-sm font-medium text-blue-600">
                                            {user?.role === 'WHOLESALER' ? order.buyer?.name : order.seller?.businessName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    {getStatusBadge(order.status)}
                                    <span className="text-xs text-gray-400">ID: {order.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-6">
                                <ul className="divide-y divide-gray-100">
                                    {order.items.map((item) => (
                                        <li key={item.id} className="py-4 flex items-center">
                                            <div className="h-16 w-16 bg-gray-100 rounded shrink-0 flex items-center justify-center overflow-hidden">
                                                {item.product.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Package className="h-6 w-6 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <h4 className="text-sm font-bold text-gray-900">{item.product.name}</h4>
                                                <p className="text-sm text-gray-500">Qty: {item.quantity} x ₹{Number(item.price).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Order Footer */}
                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-xs text-gray-500 flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Invoice Ref: {order.invoice?.id.slice(0, 8).toUpperCase() || 'N/A'}
                                </span>

                                {/* Wholesalers get a button to update status */}
                                {user?.role === 'WHOLESALER' && order.status === 'PENDING' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'PROCESSING')} // <-- Added onClick!
                                        className="text-xs bg-gray-900 text-white px-4 py-2 rounded shadow-sm hover:bg-gray-800 transition-colors active:scale-95"
                                    >
                                        Mark as Processing
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
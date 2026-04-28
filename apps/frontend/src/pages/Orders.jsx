import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Store, User, FileText, MapPin, Truck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Added for the back button
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore(); 
    const navigate = useNavigate(); // Added navigate

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
            await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
            setOrders(orders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update order status');
        }
    };

    // Helper to color-code order statuses (Upgraded for Dark Mode)
    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': 
                return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><Clock className="w-3 h-3 mr-1.5" /> Pending</span>;
            case 'PROCESSING': 
                return <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><Package className="w-3 h-3 mr-1.5" /> Processing</span>;
            case 'SHIPPED': 
                return <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><Truck className="w-3 h-3 mr-1.5" /> Shipped</span>;
            case 'DELIVERED': 
                return <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1.5" /> Delivered</span>;
            default: 
                return <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold">{status}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
                <FileText className="h-8 w-8 animate-pulse" />
                <p className="font-medium tracking-widest uppercase text-sm">Loading your orders...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 font-sans selection:bg-amber-500/30 selection:text-amber-200">
            
            {/* Added Back Button */}
            <button 
                onClick={() => navigate('/store')} 
                className="flex items-center text-zinc-400 hover:text-amber-400 font-bold text-sm tracking-wide transition-colors group mb-8"
            >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
                Back to Storefront
            </button>

            <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-wide">
                        {user?.role === 'WHOLESALER' ? (
                            <span className="text-white">Incoming Shop Orders</span>
                        ) : (
                            /* Specially Colored Text for Purchase History */
                            <span className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">My Purchase History</span>
                        )}
                    </h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        {user?.role === 'WHOLESALER' ? 'Manage orders from your buyers.' : 'Track your marketplace orders and shipping status.'}
                    </p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-[#1c1c1c] rounded-xl shadow-xl border border-dashed border-zinc-700 p-16 text-center flex flex-col items-center">
                    <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800">
                        <Package className="h-10 w-10 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white tracking-wide">No orders yet</h3>
                    <p className="text-zinc-500 mt-2 max-w-sm">When a transaction is made, the order details and invoice will appear here.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-[#1c1c1c] rounded-lg shadow-2xl border border-zinc-800 overflow-hidden group hover:border-amber-500/30 transition-colors">

                            {/* Order Header */}
                            <div className="bg-[#0a0a0a] px-6 py-4 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-6">
                                <div className="flex flex-wrap gap-8">
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Order Placed</p>
                                        <p className="text-sm font-semibold text-zinc-200">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Total</p>
                                        <p className="text-sm font-bold text-amber-500">₹{Number(order.totalAmount).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center mb-1">
                                            {user?.role === 'WHOLESALER' ? <><User className="w-3 h-3 mr-1.5" /> Buyer</> : <><Store className="w-3 h-3 mr-1.5" /> Sold By</>}
                                        </p>
                                        <p className="text-sm font-semibold text-zinc-200">
                                            {user?.role === 'WHOLESALER' ? order.buyer?.name : order.seller?.businessName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <span className="text-[11px] font-mono text-zinc-600 bg-zinc-900 px-2.5 py-1 rounded">ID: {order.id.slice(0, 8).toUpperCase()}</span>
                                    {getStatusBadge(order.status)}
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-6">
                                <ul className="divide-y divide-zinc-800/50">
                                    {order.items.map((item) => (
                                        <li key={item.id} className="py-4 flex items-center first:pt-0 last:pb-0">
                                            <div className="h-16 w-16 bg-[#F5F5F0] rounded-md shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700">
                                                {item.product.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-contain mix-blend-multiply p-1" />
                                                ) : (
                                                    <Package className="h-6 w-6 text-zinc-400" />
                                                )}
                                            </div>
                                            <div className="ml-5 flex-1">
                                                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{item.product.name}</h4>
                                                <p className="text-xs text-zinc-400 mt-1">Qty: <span className="text-zinc-200">{item.quantity}</span> × ₹{Number(item.price).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right pl-4">
                                                <p className="text-sm font-extrabold text-white">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Order Footer - Address & Actions */}
                            <div className="bg-[#0a0a0a] px-6 py-4 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                                {/* Show Shipping Address */}
                                <div className="text-sm text-zinc-400 flex items-start max-w-sm">
                                    <MapPin className="h-4 w-4 mr-2.5 mt-0.5 flex-shrink-0 text-amber-500" />
                                    <span className="leading-relaxed">{order.shippingAddress || "No address provided for this order."}</span>
                                </div>

                                {/* Dynamic Pipeline Buttons for Wholesalers */}
                                {user?.role === 'WHOLESALER' && (
                                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                        {order.status === 'PENDING' && (
                                            <button onClick={() => handleUpdateStatus(order.id, 'PROCESSING')} className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-600/50 px-5 py-2.5 rounded-md hover:bg-blue-600 hover:text-white transition-all duration-300">
                                                Mark as Processing
                                            </button>
                                        )}
                                        {order.status === 'PROCESSING' && (
                                            <button onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-purple-600/20 text-purple-400 border border-purple-600/50 px-5 py-2.5 rounded-md hover:bg-purple-600 hover:text-white transition-all duration-300">
                                                Mark as Shipped
                                            </button>
                                        )}
                                        {order.status === 'SHIPPED' && (
                                            <button onClick={() => handleUpdateStatus(order.id, 'DELIVERED')} className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 px-5 py-2.5 rounded-md hover:bg-emerald-600 hover:text-white transition-all duration-300">
                                                Mark as Delivered
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
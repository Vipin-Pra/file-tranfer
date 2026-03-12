import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        try { sessionStorage.removeItem('appState'); } catch {}
    };

    handleReload = () => {
        window.location.reload();
    };

    handleHardReset = () => {
        try {
            sessionStorage.clear();
            localStorage.clear();
        } catch {}
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-lg w-full">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-500/20 p-4 rounded-full">
                                <AlertTriangle className="w-12 h-12 text-red-500" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-white text-center mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-400 text-center mb-6">
                            An unexpected error occurred in the application.
                        </p>

                        {/* Error details (collapsible) */}
                        <details className="mb-6 bg-gray-700/30 rounded-lg p-4">
                            <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors">
                                Technical Details
                            </summary>
                            <pre className="mt-3 text-xs text-red-400 font-mono overflow-auto max-h-40 bg-gray-900 p-3 rounded">
                                {this.state.error?.toString()}
                            </pre>
                            {this.state.errorInfo && (
                                <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32 bg-gray-900 p-3 rounded">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </details>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Reload
                            </button>
                            <button
                                onClick={this.handleHardReset}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Home size={18} /> Full Reset
                            </button>
                        </div>

                        <p className="text-gray-500 text-sm text-center mt-6">
                            If the problem persists, try clearing your browser cache.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

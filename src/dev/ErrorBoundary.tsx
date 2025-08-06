import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { err?: Error };

export default class ErrorBoundary extends Component<Props, State> {
    state: State = {};
    static getDerivedStateFromError(err: Error) { return { err }; }
    componentDidCatch(err: unknown) { console.error('ErrorBoundary caught', err); }
    render() {
        if (this.state.err) {
            return (
                <div style={{ padding: 16, fontFamily: 'system-ui' }}>
                    <h2>Render error</h2>
                    <pre>{String(this.state.err.stack || this.state.err.message || this.state.err)}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

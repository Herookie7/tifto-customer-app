// components/ErrorBoundary.js
import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary: Error caught', error);
    console.error('ErrorBoundary: Error stack', error?.stack);
    console.error('ErrorBoundary: Error message', error?.message);
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary: componentDidCatch', error, info);
    console.error('ErrorBoundary: Component stack', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error occurred';
      const errorStack = this.state.error?.stack || '';
      const errorName = this.state.error?.name || 'Error';
      
      // Always show error details, even in production for debugging
      const displayStack = errorStack ? errorStack.substring(0, 500) : 'No stack trace available';
      
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong.</Text>
          <Text style={styles.errorName}>{errorName}</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <Text style={[styles.message, styles.stackText]}>
            {displayStack}
          </Text>

          <TouchableOpacity onPress={this.handleReset} style={styles.button}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 8,
  },
  errorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    textAlign: 'left',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 4,
    maxHeight: 200,
    overflow: 'scroll',
  },
  button: {
    backgroundColor: '#E4644B', // coral red or any theme color
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

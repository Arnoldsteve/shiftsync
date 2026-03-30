import { useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';

export function useRealtimeShiftEvents(
  onShiftCreated?: (data: any) => void,
  onShiftUpdated?: (data: any) => void,
  onShiftDeleted?: (data: any) => void
) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    if (onShiftCreated) {
      socket.on('shift:created', onShiftCreated);
    }

    if (onShiftUpdated) {
      socket.on('shift:updated', onShiftUpdated);
    }

    if (onShiftDeleted) {
      socket.on('shift:deleted', onShiftDeleted);
    }

    return () => {
      if (onShiftCreated) socket.off('shift:created', onShiftCreated);
      if (onShiftUpdated) socket.off('shift:updated', onShiftUpdated);
      if (onShiftDeleted) socket.off('shift:deleted', onShiftDeleted);
    };
  }, [socket, isConnected, onShiftCreated, onShiftUpdated, onShiftDeleted]);
}

export function useRealtimeAssignmentEvents(onAssignmentChanged?: (data: any) => void) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !onAssignmentChanged) return;

    socket.on('assignment:changed', onAssignmentChanged);

    return () => {
      socket.off('assignment:changed', onAssignmentChanged);
    };
  }, [socket, isConnected, onAssignmentChanged]);
}

export function useRealtimeSwapEvents(
  onSwapCreated?: (data: any) => void,
  onSwapUpdated?: (data: any) => void
) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    if (onSwapCreated) {
      socket.on('swap:created', onSwapCreated);
    }

    if (onSwapUpdated) {
      socket.on('swap:updated', onSwapUpdated);
    }

    return () => {
      if (onSwapCreated) socket.off('swap:created', onSwapCreated);
      if (onSwapUpdated) socket.off('swap:updated', onSwapUpdated);
    };
  }, [socket, isConnected, onSwapCreated, onSwapUpdated]);
}

export function useRealtimeConflictEvents(onConflictDetected?: (data: any) => void) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !onConflictDetected) return;

    socket.on('conflict:detected', onConflictDetected);

    return () => {
      socket.off('conflict:detected', onConflictDetected);
    };
  }, [socket, isConnected, onConflictDetected]);
}

export function useRealtimeCalloutEvents(onCalloutReported?: (data: any) => void) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !onCalloutReported) return;

    socket.on('callout:reported', onCalloutReported);

    return () => {
      socket.off('callout:reported', onCalloutReported);
    };
  }, [socket, isConnected, onCalloutReported]);
}

export function useRealtimeJobEvents(onJobCompleted?: (data: any) => void) {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !onJobCompleted) return;

    socket.on('job:completed', onJobCompleted);

    return () => {
      socket.off('job:completed', onJobCompleted);
    };
  }, [socket, isConnected, onJobCompleted]);
}

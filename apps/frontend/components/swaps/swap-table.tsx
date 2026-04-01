'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@shiftsync/ui';
import { Check, X } from 'lucide-react';
import type { SwapRequest } from '@/types/swap.types';

interface SwapTableProps {
  swaps: SwapRequest[];
  onApprove?: (swapId: string) => void;
  onReject?: (swapId: string) => void;
  showActions?: boolean;
}

export function SwapTable({ swaps, onApprove, onReject, showActions = false }: SwapTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Requestor</TableHead>
          <TableHead>Target Staff</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {swaps.map((swap) => (
          <TableRow key={swap.id}>
            <TableCell className="font-medium">{swap.requestorName}</TableCell>
            <TableCell>{swap.targetStaffName}</TableCell>
            <TableCell>
              {swap.shift &&
                `${new Date(swap.shift.startTime).toLocaleString()} - ${new Date(
                  swap.shift.endTime
                ).toLocaleTimeString()}`}
            </TableCell>
            <TableCell>
              <span className={`capitalize ${getStatusColor(swap.status)}`}>{swap.status}</span>
            </TableCell>
            <TableCell>{new Date(swap.createdAt).toLocaleDateString()}</TableCell>
            {showActions && swap.status === 'pending' && (
              <TableCell className="text-right space-x-2">
                {onApprove && (
                  <Button variant="ghost" size="icon" onClick={() => onApprove(swap.id)}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                {onReject && (
                  <Button variant="ghost" size="icon" onClick={() => onReject(swap.id)}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
} from '@shiftsync/ui';
import { Save } from 'lucide-react';
import { useLocationConfig, useUpdateLocationConfig } from '@/hooks/use-config';
import type { UpdateLocationConfigDto } from '@/types/config.types';

export default function ConfigPage() {
  const [locationId, setLocationId] = useState('');
  const [formData, setFormData] = useState<UpdateLocationConfigDto>({});

  const { data: config, isLoading } = useLocationConfig(locationId);
  const updateConfig = useUpdateLocationConfig();

  useEffect(() => {
    if (config) {
      setFormData({
        dailyLimitEnabled: config.dailyLimitEnabled,
        dailyLimitHours: config.dailyLimitHours,
        weeklyLimitEnabled: config.weeklyLimitEnabled,
        weeklyLimitHours: config.weeklyLimitHours,
        consecutiveDaysEnabled: config.consecutiveDaysEnabled,
        consecutiveDaysLimit: config.consecutiveDaysLimit,
        restPeriodHours: config.restPeriodHours,
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationId) {
      updateConfig.mutate({ locationId, data: formData });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Location Configuration</h1>
        <p className="text-muted-foreground">
          Configure scheduling rules and limits for each location
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Location</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loc1">Downtown</SelectItem>
              <SelectItem value="loc2">Uptown</SelectItem>
              <SelectItem value="loc3">Westside</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading configuration...</div>
      ) : config ? (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Limit</CardTitle>
                <CardDescription>
                  Maximum hours a staff member can work in a 24-hour period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dailyLimitEnabled"
                    checked={formData.dailyLimitEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyLimitEnabled: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="dailyLimitEnabled">Enable Daily Limit</Label>
                </div>
                {formData.dailyLimitEnabled && (
                  <div className="grid gap-2">
                    <Label htmlFor="dailyLimitHours">Hours</Label>
                    <Input
                      id="dailyLimitHours"
                      type="number"
                      min="1"
                      max="24"
                      value={formData.dailyLimitHours || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dailyLimitHours: parseInt(e.target.value),
                        })
                      }
                      className="max-w-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Limit</CardTitle>
                <CardDescription>
                  Maximum hours a staff member can work in a 7-day period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="weeklyLimitEnabled"
                    checked={formData.weeklyLimitEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weeklyLimitEnabled: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="weeklyLimitEnabled">Enable Weekly Limit</Label>
                </div>
                {formData.weeklyLimitEnabled && (
                  <div className="grid gap-2">
                    <Label htmlFor="weeklyLimitHours">Hours</Label>
                    <Input
                      id="weeklyLimitHours"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.weeklyLimitHours || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weeklyLimitHours: parseInt(e.target.value),
                        })
                      }
                      className="max-w-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consecutive Days Limit</CardTitle>
                <CardDescription>Maximum consecutive days a staff member can work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="consecutiveDaysEnabled"
                    checked={formData.consecutiveDaysEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        consecutiveDaysEnabled: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="consecutiveDaysEnabled">Enable Consecutive Days Limit</Label>
                </div>
                {formData.consecutiveDaysEnabled && (
                  <div className="grid gap-2">
                    <Label htmlFor="consecutiveDaysLimit">Days</Label>
                    <Input
                      id="consecutiveDaysLimit"
                      type="number"
                      min="1"
                      max="14"
                      value={formData.consecutiveDaysLimit || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consecutiveDaysLimit: parseInt(e.target.value),
                        })
                      }
                      className="max-w-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rest Period</CardTitle>
                <CardDescription>Minimum hours required between shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="restPeriodHours">Hours</Label>
                  <Input
                    id="restPeriodHours"
                    type="number"
                    min="1"
                    max="24"
                    value={formData.restPeriodHours || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        restPeriodHours: parseInt(e.target.value),
                      })
                    }
                    className="max-w-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateConfig.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Select a location to view configuration
        </div>
      )}
    </div>
  );
}

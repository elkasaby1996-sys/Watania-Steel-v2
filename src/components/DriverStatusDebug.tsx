import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, Database, Eye } from 'lucide-react';
import { useDriversStore } from '../stores/driversStore';
import { supabase } from '../lib/supabase';

export function DriverStatusDebug() {
  const { drivers, loadDrivers } = useDriversStore();
  const [dbData, setDbData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDirectFromDB = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching from DB:', error);
        setDbData([]);
      } else {
        console.log('Direct DB data:', data);
        setDbData(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch from DB:', error);
      setDbData([]);
    } finally {
      setLoading(false);
    }
  };

  const compareData = () => {
    console.log('=== DATA COMPARISON ===');
    console.log('Store drivers:', drivers);
    console.log('DB drivers:', dbData);
    
    drivers.forEach(storeDriver => {
      const dbDriver = dbData.find(db => db.id === storeDriver.id);
      if (dbDriver) {
        console.log(`Driver ${storeDriver.name}:`);
        console.log(`  Store: ${storeDriver.is_active}`);
        console.log(`  DB: ${dbDriver.is_active}`);
        console.log(`  Match: ${storeDriver.is_active === dbDriver.is_active}`);
      }
    });
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Eye className="h-5 w-5" />
          Driver Status Debug Panel
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Compare store data vs database data to debug status sync issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => loadDrivers()}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Store
          </Button>
          <Button
            onClick={fetchDirectFromDB}
            variant="outline"
            size="sm"
            disabled={loading}
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <Database className="h-4 w-4 mr-1" />
            {loading ? 'Loading...' : 'Fetch from DB'}
          </Button>
          <Button
            onClick={compareData}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            Compare Data
          </Button>
        </div>

        {dbData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">Store Data</h4>
              <div className="space-y-2">
                {drivers.map(driver => (
                  <div key={driver.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm">{driver.name}</span>
                    <Badge className={driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">Database Data</h4>
              <div className="space-y-2">
                {dbData.map(driver => (
                  <div key={driver.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm">{driver.name}</span>
                    <Badge className={driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

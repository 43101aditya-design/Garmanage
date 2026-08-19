import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Database, Table as TableIcon, Key, Link as LinkIcon, List, Eye } from 'lucide-react';
import { useDbStore } from '../../../store/dbStore';
import { DbExplorerService } from '../../../api/services/dbExplorerService';

export const DatabaseExplorer = () => {
  const [selectedTable, setSelectedTable] = useState<string>('Customer');
  const [schemaData, setSchemaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const dbStore = useDbStore();
  
  useEffect(() => {
    DbExplorerService.getSchema().then(data => {
      setSchemaData(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading schema from MySQL...</div>;
  }

  // Handle Mock vs Real format
  let tablesList = [];
  let currentSchema = null;
  let tableData = [];

  if (schemaData.isMock) {
    tablesList = schemaData.tables;
    currentSchema = tablesList.find((s: any) => s.name === selectedTable);
    tableData = (dbStore as any)[currentSchema?.storeKey || 'customers'] || [];
  } else {
    tablesList = Object.keys(schemaData.tables).map(key => ({ name: key, ...schemaData.tables[key] }));
    currentSchema = tablesList.find(s => s.name === selectedTable);
    tableData = []; // Real data would be fetched per table, leaving empty for schema view for now, or we can just omit it
  }

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Database Explorer</h2>
          <p className="text-muted-foreground mt-1">
            Browse tables, schemas, and relationships visually.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Schema List */}
        <Card className="col-span-1 flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
          <CardHeader className="border-b pb-4 shrink-0 bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              svsms_db
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <div className="space-y-1">
              <div className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TableIcon className="h-4 w-4" /> Tables ({tablesList.length})
              </div>
              {tablesList.map((table: any) => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                    selectedTable === table.name 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TableIcon className="h-4 w-4 opacity-50" />
                    {table.name}
                  </span>
                  {selectedTable === table.name && (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Details */}
        {currentSchema ? (
          <div className="col-span-3 flex flex-col h-[calc(100vh-12rem)] space-y-6 overflow-y-auto custom-scrollbar pr-2">
            
            {/* Header Stats */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <TableIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{currentSchema.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{currentSchema.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-bold">{schemaData.isMock ? tableData.length : currentSchema.rowCount}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Records</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-bold">{currentSchema.columns.length}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Columns</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Schema Definition */}
            <Card>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <List className="h-5 w-5 text-primary" />
                  Schema Definition
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Column Name</th>
                        <th className="px-6 py-3 font-semibold">Data Type</th>
                        <th className="px-6 py-3 font-semibold">Constraints</th>
                        <th className="px-6 py-3 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {currentSchema.columns.map((col: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            {col.isPrimaryKey && <span title="Primary Key"><Key className="h-4 w-4 text-yellow-500" /></span>}
                            {col.isForeignKey && <span title="Foreign Key"><LinkIcon className="h-4 w-4 text-blue-500" /></span>}
                            {!col.isPrimaryKey && !col.isForeignKey && <div className="h-4 w-4" />}
                            {col.name}
                          </td>
                          <td className="px-6 py-4 text-primary font-mono text-xs">{col.type}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {col.isPrimaryKey && <Badge variant="warning" className="text-[10px] py-0">PK</Badge>}
                              {col.isForeignKey && <Badge variant="secondary" className="text-[10px] py-0 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">FK: {col.foreignKeyReference || col.references}</Badge>}
                              {(col.isNullable || col.nullable) && <Badge variant="outline" className="text-[10px] py-0 border-dashed">NULL</Badge>}
                              {(!col.isNullable && !col.nullable) && !col.isPrimaryKey && <Badge variant="outline" className="text-[10px] py-0 border-solid text-muted-foreground">NOT NULL</Badge>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Sample Data */}
            <Card>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Sample Records (Limit 5)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-muted-foreground bg-muted/50">
                      <tr>
                        {currentSchema.columns.map((col: any) => (
                          <th key={col.name} className="px-6 py-3 font-mono font-semibold">{col.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {tableData.length === 0 ? (
                        <tr>
                          <td colSpan={currentSchema.columns.length} className="px-6 py-8 text-center text-muted-foreground italic">
                            {schemaData.isMock ? 'No records found in table.' : 'Sample records preview not available in real DB mode without a dedicated query.'}
                          </td>
                        </tr>
                      ) : (
                        tableData.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            {currentSchema.columns.map((col: any) => (
                              <td key={col.name} className="px-6 py-3 font-mono text-xs text-foreground/80">
                                {row[col.name] !== null && row[col.name] !== undefined 
                                  ? String(row[col.name]) 
                                  : <span className="text-muted-foreground/50 italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>
        ) : null}

      </div>
    </div>
  );
};

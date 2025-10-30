import { useState, useMemo, useEffect as React_useEffect } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Mail, Phone, Edit, Search, Building2, TrendingUp, ArrowUpDown } from "lucide-react";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { TruncatedCell } from "@/components/TruncatedCell";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  expected_value: number | null;
  follow_up_date: string | null;
  converted_to_customer_id: string | null;
  converted_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  'New': 'bg-blue-500',
  'In Progress': 'bg-yellow-500',
  'Completed': 'bg-green-500',
  'Declined': 'bg-red-500',
};

const Pipeline = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch leads
  const { data: leads, isLoading, error: queryError } = useQuery({
    queryKey: ["leads-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Lead[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    notifyOnChangeProps: ['data', 'error'],
  });

  // Sync leads to local state
  React.useEffect(() => {
    if (leads) {
      setLocalLeads(leads);
    }
  }, [leads]);

  // Show error if query fails
  if (queryError) {
    console.error('Error fetching leads:', queryError);
  }

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    if (!localLeads || localLeads.length === 0) return [];

    return localLeads.filter(lead => {
      const matchesSearch = !debouncedSearchTerm ||
        lead.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [localLeads, debouncedSearchTerm, statusFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!localLeads) return { total: 0, completed: 0, active: 0, totalValue: 0 };

    return {
      total: localLeads.length,
      completed: localLeads.filter(l => l.status === 'Completed').length,
      active: localLeads.filter(l => !['Completed', 'Declined'].includes(l.status)).length,
      totalValue: localLeads
        .filter(l => l.status !== 'Declined')
        .reduce((sum, l) => sum + (l.expected_value || 0), 0),
    };
  }, [localLeads]);

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsAddLeadOpen(true);
  };

  const handleConvertToCustomer = (lead: Lead) => {
    setConvertingLead(lead);
    setIsAddCustomerOpen(true);
  };

  const handleStatusChange = async (leadId: string, newStatus: string, currentStatus: string) => {
    // Prevent multiple simultaneous updates
    if (updatingLeadId) {
      return;
    }

    // Validate status transitions
    const invalidTransitions: Record<string, string[]> = {
      'Declined': ['New', 'In Progress'], // Can't go back from Declined
      'Completed': ['New', 'In Progress'], // Can't go back from Completed
    };

    if (invalidTransitions[currentStatus]?.includes(newStatus)) {
      toast({
        title: "Invalid Status Change",
        description: `Cannot change status from ${currentStatus} to ${newStatus}. Create a new lead instead.`,
        variant: "destructive",
      });
      return;
    }

    setUpdatingLeadId(leadId);

    try {
      // Update in database
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update local state immediately without refetching
      setLocalLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      toast({
        title: "Status Updated",
        description: "Lead status has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleCustomerCreated = async () => {
    if (!convertingLead) return;

    // After customer is created successfully, mark lead as converted
    // Note: This is a simplified approach. In production, you'd want to capture the customer ID
    // from the CustomerFormModal and update the lead accordingly
    try {
      await supabase
        .from("leads")
        .update({
          status: 'Completed',
          converted_at: new Date().toISOString()
        })
        .eq("id", convertingLead.id);

      queryClient.invalidateQueries({ queryKey: ["leads-list"] });
      setConvertingLead(null);
      setIsAddCustomerOpen(false);

      toast({
        title: "Lead Converted",
        description: "Lead has been converted to customer successfully.",
      });
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage your leads
          </p>
        </div>
        <Button onClick={() => {
          setEditingLead(null);
          setIsAddLeadOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first lead'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsAddLeadOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Expected Value</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads && filteredLeads.length > 0 && filteredLeads.map((lead) => {
                    if (!lead || !lead.id) return null;
                    return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.name && <TruncatedCell content={String(lead.name)} maxLength={25} />}
                      </TableCell>
                      <TableCell>
                        {lead.company ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <TruncatedCell content={String(lead.company)} maxLength={20} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                              <TruncatedCell content={String(lead.email)} maxLength={25} />
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{String(lead.phone)}</span>
                            </div>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.status && (
                          <Badge
                            className={`${statusColors[lead.status] || 'bg-gray-500'} text-white border-0 hover:opacity-90 transition-opacity cursor-default`}
                            style={{
                              backgroundColor: lead.status === 'New' ? '#3b82f6' :
                                             lead.status === 'In Progress' ? '#f59e0b' :
                                             lead.status === 'Completed' ? '#10b981' :
                                             lead.status === 'Declined' ? '#ef4444' : '#6b7280'
                            }}
                          >
                            {String(lead.status)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.source ? (
                          <TruncatedCell content={String(lead.source)} maxLength={15} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.expected_value ? (
                          <span>£{Number(lead.expected_value).toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.follow_up_date ? (
                          <span>{format(new Date(lead.follow_up_date), 'MMM dd, yyyy')}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.status}
                            onValueChange={(value) => {
                              if (value !== lead.status) {
                                handleStatusChange(lead.id, value, lead.status);
                              }
                            }}
                            disabled={updatingLeadId === lead.id}
                          >
                            <SelectTrigger className="w-32 h-8" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent onClick={(e) => e.stopPropagation()}>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Declined">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLead(lead)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {lead.status === 'Completed' && !lead.converted_to_customer_id && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleConvertToCustomer(lead)}
                            >
                              Add Customer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Lead Dialog */}
      <AddLeadDialog
        open={isAddLeadOpen}
        onOpenChange={(open) => {
          setIsAddLeadOpen(open);
          if (!open) setEditingLead(null);
        }}
        lead={editingLead}
      />

      {/* Add Customer Dialog (for conversion) */}
      <CustomerFormModal
        open={isAddCustomerOpen}
        onOpenChange={(open) => {
          setIsAddCustomerOpen(open);
          if (!open) {
            setConvertingLead(null);
          } else if (convertingLead) {
            // If customer was added, mark lead as converted
            handleCustomerCreated();
          }
        }}
        customer={null}
      />
    </div>
  );
};

export default Pipeline;

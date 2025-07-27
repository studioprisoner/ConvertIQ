'use client';

import { Button } from '@/components/button';
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog';
import { Field, FieldGroup, Fieldset, Label } from '@/components/fieldset';
import { Heading } from '@/components/heading';
import { Input } from '@/components/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { useFeatureGate } from '@/hooks/use-feature-gate';
import { FeatureGate } from '@/components/feature-gating/feature-gate';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/16/solid';
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

interface Domain {
  id: string;
  url: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'pending';
  lastScanAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
  });

  const multipleWebsitesGate = useFeatureGate('multiple_websites');
  const domainsQuery = trpc.websites.list.useQuery();
  const createDomainMutation = trpc.websites.create.useMutation();
  const updateDomainMutation = trpc.websites.update.useMutation();
  const deleteDomainMutation = trpc.websites.delete.useMutation();

  useEffect(() => {
    if (domainsQuery.data) {
      setDomains(domainsQuery.data);
      setLoading(false);
    }
  }, [domainsQuery.data]);

  const handleAddDomain = async () => {
    try {
      await createDomainMutation.mutateAsync({
        name: formData.name,
        url: formData.url,
        description: formData.description || undefined,
      });
      
      setIsAddDialogOpen(false);
      setFormData({ name: '', url: '', description: '' });
      domainsQuery.refetch();
    } catch (error) {
      console.error('Failed to add domain:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to add domain';
      alert(errorMessage);
    }
  };

  const handleEditDomain = async () => {
    if (!selectedDomain) return;
    
    try {
      await updateDomainMutation.mutateAsync({
        id: selectedDomain.id,
        name: formData.name,
        url: formData.url,
        description: formData.description || undefined,
      });
      
      setIsEditDialogOpen(false);
      setSelectedDomain(null);
      setFormData({ name: '', url: '', description: '' });
      domainsQuery.refetch();
    } catch (error) {
      console.error('Failed to update domain:', error);
    }
  };

  const handleDeleteDomain = async () => {
    if (!selectedDomain) return;
    
    try {
      await deleteDomainMutation.mutateAsync({ id: selectedDomain.id });
      
      setIsDeleteDialogOpen(false);
      setSelectedDomain(null);
      domainsQuery.refetch();
    } catch (error) {
      console.error('Failed to delete domain:', error);
    }
  };

  const openEditDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setFormData({
      name: domain.name,
      url: domain.url,
      description: domain.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge color="green">Active</Badge>;
      case 'inactive':
        return <Badge color="gray">Inactive</Badge>;
      case 'pending':
        return <Badge color="yellow">Pending</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <FeatureGate 
      featureKey="multiple_websites"
      fallback={
        <div className="text-center py-12">
          <Heading>Domain Management</Heading>
          <Text className="mt-4">
            Multiple domain management is only available on Pro plans. Pro plans can manage up to 10 domains.
          </Text>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Domains</Heading>
            <Text>
              Manage your domains for analysis and monitoring. Pro plans can manage up to 10 domains.
              {domains.length > 0 && (
                <span className="block mt-1">
                  Currently using {domains.length} of 10 domains.
                  {domains.length >= 10 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium"> (Limit reached)</span>
                  )}
                </span>
              )}
            </Text>
          </div>
          <Button 
            type="button" 
            onClick={() => setIsAddDialogOpen(true)}
            disabled={domains.length >= 10}
            title={domains.length >= 10 ? "Domain limit reached (10/10). Remove domains to add new ones." : "Add a new domain"}
          >
            <PlusIcon />
            Add Domain
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Text>Loading domains...</Text>
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-12">
            <Text>No domains added yet.</Text>
            <Button 
              type="button" 
              className="mt-4"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <PlusIcon />
              Add Your First Domain
            </Button>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Domain</TableHeader>
                <TableHeader>URL</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Last Scan</TableHeader>
                <TableHeader>Added</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{domain.name}</div>
                      {domain.description && (
                        <div className="text-sm text-gray-500">{domain.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a 
                      href={domain.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                    >
                      {domain.url}
                    </a>
                  </TableCell>
                  <TableCell>{getStatusBadge(domain.status)}</TableCell>
                  <TableCell>
                    {domain.lastScanAt ? formatDate(domain.lastScanAt) : 'Never'}
                  </TableCell>
                  <TableCell>{formatDate(domain.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        color="light"
                        onClick={() => openEditDialog(domain)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        type="button"
                        color="red"
                        onClick={() => openDeleteDialog(domain)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Add Domain Dialog */}
        <Dialog open={isAddDialogOpen} onClose={setIsAddDialogOpen}>
          <DialogTitle>Add New Domain</DialogTitle>
          <DialogDescription>
            Add a domain to your account for analysis and monitoring. You can scan any page from this domain.
          </DialogDescription>
          <DialogBody>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>Domain Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Business Website"
                  />
                </Field>
                <Field>
                  <Label>Domain URL</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    type="url"
                  />
                </Field>
                <Field>
                  <Label>Description (Optional)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the domain"
                  />
                </Field>
              </FieldGroup>
            </Fieldset>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDomain}
              disabled={!formData.name || !formData.url || createDomainMutation.isPending}
            >
              {createDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Domain Dialog */}
        <Dialog open={isEditDialogOpen} onClose={setIsEditDialogOpen}>
          <DialogTitle>Edit Domain</DialogTitle>
          <DialogDescription>
            Update the domain information.
          </DialogDescription>
          <DialogBody>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>Domain Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Business Website"
                  />
                </Field>
                <Field>
                  <Label>Domain URL</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    type="url"
                  />
                </Field>
                <Field>
                  <Label>Description (Optional)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the domain"
                  />
                </Field>
              </FieldGroup>
            </Fieldset>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditDomain}
              disabled={!formData.name || !formData.url || updateDomainMutation.isPending}
            >
              {updateDomainMutation.isPending ? 'Updating...' : 'Update Domain'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Domain Dialog */}
        <Dialog open={isDeleteDialogOpen} onClose={setIsDeleteDialogOpen}>
          <DialogTitle>Delete Domain</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{selectedDomain?.name}&rdquo;? This action cannot be undone.
            All associated reports and data will be permanently removed.
          </DialogDescription>
          <DialogActions>
            <Button plain onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteDomain}
              disabled={deleteDomainMutation.isPending}
            >
              {deleteDomainMutation.isPending ? 'Deleting...' : 'Delete Domain'}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
'use client';

import { Button } from '@/components/button';
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog';
import { Field, FieldGroup, Fieldset, Label } from '@/components/fieldset';
import { Heading } from '@/components/heading';
import { Input } from '@/components/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { FeatureGate } from '@/components/features/feature-gating/feature-gate';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/16/solid';
import { GlobeAltIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

interface Domain {
  id: string;
  rootDomain: string;
  displayName: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
  validationStatus?: string | null;
  isValidated?: boolean | null;
  pageCount: number;
  lastScanAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    displayName: '',
    domain: '',
    description: '',
  });

  // Domain ownership verification (CON-106)
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyDomain, setVerifyDomain] = useState<Domain | null>(null);
  const [verifyMetaTag, setVerifyMetaTag] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; reason?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const domainsQuery = trpc.websites.list.useQuery();
  const createDomainMutation = trpc.websites.create.useMutation();
  const updateDomainMutation = trpc.websites.update.useMutation();
  const deleteDomainMutation = trpc.websites.delete.useMutation();
  const requestVerificationMutation = trpc.websites.requestVerification.useMutation();
  const confirmVerificationMutation = trpc.websites.confirmVerification.useMutation();

  useEffect(() => {
    if (domainsQuery.data) {
      setDomains(domainsQuery.data as Domain[]);
      setLoading(false);
    }
  }, [domainsQuery.data]);

  const handleAddDomain = async () => {
    try {
      await createDomainMutation.mutateAsync({
        displayName: formData.displayName,
        domain: formData.domain,
        description: formData.description || undefined,
      });

      setIsAddDialogOpen(false);
      setFormData({ displayName: '', domain: '', description: '' });
      domainsQuery.refetch();
    } catch (error) {
      console.error('Failed to add domain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add domain';
      alert(errorMessage);
    }
  };

  const handleEditDomain = async () => {
    if (!selectedDomain) return;

    try {
      await updateDomainMutation.mutateAsync({
        id: selectedDomain.id,
        displayName: formData.displayName || undefined,
        description: formData.description || undefined,
      });

      setIsEditDialogOpen(false);
      setSelectedDomain(null);
      setFormData({ displayName: '', domain: '', description: '' });
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
      displayName: domain.displayName || '',
      domain: domain.rootDomain,
      description: domain.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsDeleteDialogOpen(true);
  };

  const openVerifyDialog = (domain: Domain) => {
    setVerifyDomain(domain);
    setVerifyMetaTag(null);
    setVerifyResult(null);
    setCopied(false);
    setIsVerifyDialogOpen(true);
  };

  const handleRequestVerification = async () => {
    if (!verifyDomain) return;
    try {
      const res = await requestVerificationMutation.mutateAsync({ domainId: verifyDomain.id });
      setVerifyMetaTag(res.metaTag);
      setVerifyResult(null);
      domainsQuery.refetch();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start verification');
    }
  };

  const handleConfirmVerification = async () => {
    if (!verifyDomain) return;
    try {
      const res = await confirmVerificationMutation.mutateAsync({ domainId: verifyDomain.id });
      setVerifyResult(res);
      if (res.verified) {
        domainsQuery.refetch();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Verification check failed');
    }
  };

  const copyMetaTag = async () => {
    if (!verifyMetaTag) return;
    await navigator.clipboard.writeText(verifyMetaTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVerificationBadge = (domain: Domain) => {
    switch (domain.validationStatus) {
      case 'valid':
        return <Badge color="green">Verified</Badge>;
      case 'pending':
        return <Badge color="yellow">Pending</Badge>;
      case 'invalid':
        return <Badge color="red">Invalid</Badge>;
      default:
        return <Badge color="zinc">Unverified</Badge>;
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
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
        <div className="space-y-6">
          <Heading>Domains</Heading>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10">
            <div className="max-w-sm mx-auto text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <GlobeAltIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Manage multiple domains
              </h2>
              <Text className="mb-6">
                Pro plan lets you manage up to 10 root domains — track scans, verify ownership,
                and organise your entire web portfolio in one place.
              </Text>
              <div className="space-y-2 text-left mb-7">
                {[
                  'Up to 10 domains',
                  'Domain ownership verification',
                  'Per-domain scan history',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Upgrade to Pro
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Domains</Heading>
            <Text>
              Manage your root domains for analysis and monitoring. Pro plans can manage up to 10 domains.
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
            title={domains.length >= 10 ? 'Domain limit reached (10/10). Remove domains to add new ones.' : 'Add a new domain'}
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
                <TableHeader>Pages</TableHeader>
                <TableHeader>Ownership</TableHeader>
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
                      <div className="font-medium">{domain.displayName || domain.rootDomain}</div>
                      <a
                        href={`https://${domain.rootDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-500 hover:text-blue-600 truncate block max-w-xs"
                      >
                        {domain.rootDomain}
                      </a>
                      {domain.description && (
                        <div className="text-sm text-gray-500">{domain.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{domain.pageCount}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getVerificationBadge(domain)}
                      {domain.validationStatus !== 'valid' && (
                        <Button
                          type="button"
                          plain
                          onClick={() => openVerifyDialog(domain)}
                          title="Verify domain ownership"
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(domain.lastScanAt)}</TableCell>
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
            Add a root domain to your account. You can then scan any page on that domain.
          </DialogDescription>
          <DialogBody>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>Display Name</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="My Business Website"
                  />
                </Field>
                <Field>
                  <Label>Domain</Label>
                  <Input
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="example.com"
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
              disabled={!formData.displayName || !formData.domain || createDomainMutation.isPending}
            >
              {createDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Domain Dialog */}
        <Dialog open={isEditDialogOpen} onClose={setIsEditDialogOpen}>
          <DialogTitle>Edit Domain</DialogTitle>
          <DialogDescription>
            Update the display name or description. The domain itself cannot be changed.
          </DialogDescription>
          <DialogBody>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>Domain</Label>
                  <Input value={selectedDomain?.rootDomain || ''} disabled />
                </Field>
                <Field>
                  <Label>Display Name</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="My Business Website"
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
              disabled={updateDomainMutation.isPending}
            >
              {updateDomainMutation.isPending ? 'Updating...' : 'Update Domain'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Verify Domain Ownership Dialog */}
        <Dialog open={isVerifyDialogOpen} onClose={setIsVerifyDialogOpen}>
          <DialogTitle>Verify domain ownership</DialogTitle>
          <DialogDescription>
            Prove you own {verifyDomain?.rootDomain} by adding a meta tag to its homepage.
            Verification is optional and does not affect scanning.
          </DialogDescription>
          <DialogBody>
            {!verifyMetaTag ? (
              <Text>
                Generate a verification tag, add it to the <code>&lt;head&gt;</code> of your
                homepage, then come back and check. You can leave the tag in place permanently.
              </Text>
            ) : (
              <div className="space-y-4">
                <div>
                  <Text className="font-medium">1. Add this tag to your homepage&rsquo;s <code>&lt;head&gt;</code>:</Text>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs">
                      {verifyMetaTag}
                    </code>
                    <Button type="button" plain onClick={copyMetaTag} title="Copy to clipboard">
                      <ClipboardIcon />
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
                <Text className="font-medium">2. Deploy the change, then click &ldquo;Check now&rdquo;.</Text>
                {verifyResult && !verifyResult.verified && (
                  <Text className="text-red-600 dark:text-red-400">
                    Not verified yet: {verifyResult.reason}
                  </Text>
                )}
                {verifyResult?.verified && (
                  <Text className="text-green-600 dark:text-green-400">
                    Verified — ownership confirmed.
                  </Text>
                )}
              </div>
            )}
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setIsVerifyDialogOpen(false)}>
              {verifyResult?.verified ? 'Done' : 'Close'}
            </Button>
            {!verifyMetaTag ? (
              <Button
                onClick={handleRequestVerification}
                disabled={requestVerificationMutation.isPending}
              >
                {requestVerificationMutation.isPending ? 'Generating…' : 'Generate tag'}
              </Button>
            ) : !verifyResult?.verified ? (
              <Button
                onClick={handleConfirmVerification}
                disabled={confirmVerificationMutation.isPending}
              >
                {confirmVerificationMutation.isPending ? 'Checking…' : 'Check now'}
              </Button>
            ) : null}
          </DialogActions>
        </Dialog>

        {/* Delete Domain Dialog */}
        <Dialog open={isDeleteDialogOpen} onClose={setIsDeleteDialogOpen}>
          <DialogTitle>Delete Domain</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{selectedDomain?.displayName || selectedDomain?.rootDomain}&rdquo;?
            This action cannot be undone. All associated reports and data will be permanently removed.
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

import { describe, it, expect } from 'vitest';
import { isPrivateIp, assertPublicTarget } from '@/lib/url-validation';

describe('SSRF guard (CON-94)', () => {
  describe('isPrivateIp — IPv4', () => {
    it('flags RFC1918 ranges', () => {
      expect(isPrivateIp('10.1.2.3')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
    });

    it('does not flag adjacent public ranges', () => {
      expect(isPrivateIp('172.32.0.1')).toBe(false);
      expect(isPrivateIp('172.15.255.255')).toBe(false);
      expect(isPrivateIp('11.0.0.1')).toBe(false);
      expect(isPrivateIp('192.169.0.1')).toBe(false);
    });

    it('flags loopback, link-local/metadata, unspecified, and CGNAT', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.254')).toBe(true);
      expect(isPrivateIp('169.254.169.254')).toBe(true); // cloud metadata
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
      expect(isPrivateIp('100.128.0.1')).toBe(false);
    });

    it('passes well-known public addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
    });
  });

  describe('isPrivateIp — IPv6', () => {
    it('flags loopback, unspecified, link-local, and unique-local', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd12:3456::1')).toBe(true);
    });

    it('flags IPv4-mapped private addresses and passes mapped public ones', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:192.168.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
    });

    it('passes public IPv6', () => {
      expect(isPrivateIp('2607:f8b0::1')).toBe(false);
    });
  });

  describe('isPrivateIp — non-IPs', () => {
    it('returns false for hostnames (DNS handled separately)', () => {
      expect(isPrivateIp('example.com')).toBe(false);
      expect(isPrivateIp('localhost')).toBe(false);
      expect(isPrivateIp('999.1.1.1')).toBe(false); // not a valid IPv4
    });
  });

  describe('assertPublicTarget — IP literals and internal names (no DNS needed)', () => {
    it('blocks loopback and private IP-literal URLs', async () => {
      expect((await assertPublicTarget('http://127.0.0.1/x')).safe).toBe(false);
      expect((await assertPublicTarget('http://10.0.0.5:8080/admin')).safe).toBe(false);
      expect((await assertPublicTarget('http://169.254.169.254/latest/meta-data/')).safe).toBe(false);
    });

    it('blocks decimal-encoded IPs (URL parser normalises them)', async () => {
      const result = await assertPublicTarget('http://2130706433/'); // 127.0.0.1
      expect(result.safe).toBe(false);
    });

    it('blocks localhost and internal hostname suffixes', async () => {
      expect((await assertPublicTarget('http://localhost:3000')).safe).toBe(false);
      expect((await assertPublicTarget('http://foo.localhost/')).safe).toBe(false);
      expect((await assertPublicTarget('http://db.internal/')).safe).toBe(false);
      expect((await assertPublicTarget('http://printer.local/')).safe).toBe(false);
    });

    it('blocks IPv6 loopback URL', async () => {
      expect((await assertPublicTarget('http://[::1]/')).safe).toBe(false);
    });

    it('allows public IP literals', async () => {
      expect((await assertPublicTarget('http://8.8.8.8/')).safe).toBe(true);
    });

    it('rejects unparseable URLs', async () => {
      expect((await assertPublicTarget('not a url')).safe).toBe(false);
    });
  });
});

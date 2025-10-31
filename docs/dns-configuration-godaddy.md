# DNS Configuration for GoDaddy

## TTL Settings for GoDaddy

GoDaddy DNS provides limited TTL (Time To Live) options. The available values are:

- **600 seconds** (10 minutes) - **RECOMMENDED** for production
- 3600 seconds (1 hour)
- 7200 seconds (2 hours) 
- 14400 seconds (4 hours)
- 86400 seconds (24 hours)

## Recommended DNS Configuration

### For Production (amerivetaibot.bcgenrolls.com)

```
Type: CNAME
Name: amerivetaibot
Value: cname.vercel-dns.com
TTL: 600 seconds (10 minutes)
```

### Why 600 seconds (10 minutes)?

1. **Fastest propagation** - Changes take effect within 10 minutes
2. **Good balance** - Not too aggressive on DNS queries, not too slow for updates
3. **GoDaddy compatible** - This is the minimum TTL available
4. **Production ready** - Standard for most production applications

## Cache Configuration Alignment

The application cache TTL has been configured to align with DNS TTL:

```typescript
export const analyticsCacheConfig: CacheConfig = {
  ttl: 600, // 10 minutes (matches DNS TTL)
  maxSize: 1000,
  strategy: 'TTL',
  compression: false,
  serialization: 'json'
};
```

## DNS Change Process

1. **Update DNS record** in GoDaddy dashboard
2. **Wait 10 minutes** for propagation
3. **Verify changes** using `nslookup` or `dig`
4. **Test application** to ensure connectivity

## Verification Commands

```bash
# Check DNS resolution
nslookup amerivetaibot.bcgenrolls.com

# Check with specific DNS server
nslookup amerivetaibot.bcgenrolls.com 8.8.8.8

# Check TTL value
dig amerivetaibot.bcgenrolls.com
```

## Troubleshooting

### If DNS changes don't propagate:
1. Clear local DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
2. Wait full 10 minutes after change
3. Check with different DNS servers (8.8.8.8, 1.1.1.1)
4. Contact GoDaddy support if issues persist

### If application cache conflicts:
1. The 600-second TTL aligns with DNS, so no conflicts expected
2. Monitor cache hit rates in application logs
3. Adjust application cache TTL if needed (can be different from DNS TTL)

## Production Checklist

- [ ] DNS record created with 600-second TTL
- [ ] CNAME points to cname.vercel-dns.com
- [ ] DNS propagation verified (10 minutes)
- [ ] Application accessible via custom domain
- [ ] SSL certificate automatically provisioned by Vercel
- [ ] Cache configuration updated to 600 seconds
- [ ] Performance monitoring active

---

**Note**: While 300 seconds (5 minutes) would be ideal, 600 seconds (10 minutes) is the best available option with GoDaddy and provides excellent performance for production use.

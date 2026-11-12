import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Client, Invoice, InvoiceItem, Payment, Settings } from '../types';
import { fmtDate, tzs, METHOD_LABEL } from '../format';

const C = { ink: '#15183A', muted: '#5B607E', line: '#DCDFEC', indigo: '#2D2F8F', saffron: '#F2A007', coral: '#E4572E', teal: '#0A6466', sunk: '#F3F4FA' };

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, color: C.ink, fontFamily: 'Helvetica', lineHeight: 1.35 },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  mark: { width: 30, height: 30, borderRadius: 7, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  markText: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 14 },
  wm: { fontFamily: 'Helvetica-Bold', fontSize: 16 },
  muted: { color: C.muted },
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.indigo, textAlign: 'right' },
  label: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  bold: { fontFamily: 'Helvetica-Bold' },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.muted, textTransform: 'uppercase', paddingVertical: 6 },
  td: { paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: C.line },
  box: { backgroundColor: C.sunk, borderRadius: 6, padding: 12 },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, flexDirection: 'row' },
});

export function InvoicePdf({ inv, client, items, payments, settings }: { inv: Invoice; client: Client; items: InvoiceItem[]; payments: Payment[]; settings: Settings }) {
  const balance = Number(inv.total) - Number(inv.amount_paid);
  const statusText = inv.status === 'paid' ? 'PAID' : inv.status === 'void' ? 'VOID' : inv.status === 'draft' ? 'DRAFT' : balance < Number(inv.total) ? 'PART PAID' : 'DUE';
  return (
    <Document title={`Invoice ${inv.number}`} author={settings.brand_name}>
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            <View style={[s.row, { alignItems: 'center', marginBottom: 10 }]}>
              <View style={s.mark}><Text style={s.markText}>s<Text style={{ color: C.saffron }}>/</Text></Text></View>
              <Text style={s.wm}>serengeti<Text style={{ color: C.coral, fontFamily: 'Helvetica' }}>/</Text><Text style={{ color: C.indigo, fontFamily: 'Helvetica' }}>labs</Text></Text>
            </View>
            <Text style={s.bold}>{settings.company_name}</Text>
            {settings.address ? <Text style={s.muted}>{settings.address}</Text> : null}
            <Text style={s.muted}>{[settings.phone, settings.email].filter(Boolean).join(' · ')}</Text>
            {settings.tin || settings.vrn ? <Text style={s.muted}>{[settings.tin && `TIN ${settings.tin}`, settings.vrn && `VRN ${settings.vrn}`].filter(Boolean).join(' · ')}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.h1}>{Number(inv.vat_rate) > 0 ? 'TAX INVOICE' : 'INVOICE'}</Text>
            <Text style={[s.bold, { fontSize: 11, marginTop: 4 }]}>{inv.number}</Text>
            <Text style={[s.bold, { marginTop: 6, color: statusText === 'PAID' ? C.teal : statusText === 'VOID' ? C.muted : C.coral }]}>{statusText}</Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 24, gap: 16 }]}>
          <View style={[s.box, { flex: 1.4 }]}>
            <Text style={s.label}>Bill to</Text>
            <Text style={[s.bold, { fontSize: 11 }]}>{client.name}</Text>
            {client.contact_person ? <Text>{client.contact_person}</Text> : null}
            {client.address ? <Text style={s.muted}>{client.address}</Text> : null}
            <Text style={s.muted}>{[client.phone, client.email].filter(Boolean).join(' · ')}</Text>
            {client.tin ? <Text style={s.muted}>TIN {client.tin}</Text> : null}
          </View>
          <View style={[s.box, { flex: 1 }]}>
            <Text style={s.label}>Issue date</Text><Text style={[s.bold, { marginBottom: 6 }]}>{fmtDate(inv.issue_date)}</Text>
            <Text style={s.label}>Due date</Text><Text style={[s.bold, { marginBottom: inv.period_start ? 6 : 0 }]}>{fmtDate(inv.due_date)}</Text>
            {inv.period_start ? <><Text style={s.label}>Service period</Text><Text style={s.bold}>{fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</Text></> : null}
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={s.row}>
            <Text style={[s.th, { flex: 1 }]}>Description</Text>
            <Text style={[s.th, { width: 40, textAlign: 'right' }]}>Qty</Text>
            <Text style={[s.th, { width: 90, textAlign: 'right' }]}>Unit price</Text>
            <Text style={[s.th, { width: 95, textAlign: 'right' }]}>Amount</Text>
          </View>
          {items.map((it) => (
            <View key={it.id} style={s.row} wrap={false}>
              <Text style={[s.td, { flex: 1, paddingRight: 8 }]}>{it.description}</Text>
              <Text style={[s.td, { width: 40, textAlign: 'right' }]}>{Number(it.quantity)}</Text>
              <Text style={[s.td, { width: 90, textAlign: 'right' }]}>{tzs(it.unit_price)}</Text>
              <Text style={[s.td, { width: 95, textAlign: 'right' }]}>{tzs(it.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={{ alignSelf: 'flex-end', width: 230, marginTop: 10 }}>
          {[
            ['Subtotal', tzs(inv.subtotal)],
            ...(Number(inv.vat_rate) > 0 ? [[`VAT ${Number(inv.vat_rate)}%`, tzs(inv.vat_amount)]] : []),
            ['Total', tzs(inv.total)],
            ...(Number(inv.amount_paid) > 0 ? [['Paid', `- ${tzs(inv.amount_paid)}`]] : []),
          ].map(([k, v]) => (
            <View key={k} style={[s.between, { paddingVertical: 3 }]}><Text style={s.muted}>{k}</Text><Text>{v}</Text></View>
          ))}
          <View style={[s.between, { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ink }]}>
            <Text style={[s.bold, { fontSize: 11 }]}>Balance due</Text>
            <Text style={[s.bold, { fontSize: 13, color: C.indigo }]}>{inv.status === 'void' ? '—' : tzs(balance)}</Text>
          </View>
        </View>

        {payments.length ? (
          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>Payments received</Text>
            {payments.map((p) => (
              <Text key={p.id} style={s.muted}>{fmtDate(p.paid_at)} · {METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ''} · {tzs(p.amount)}</Text>
            ))}
          </View>
        ) : null}

        {inv.status !== 'paid' && inv.status !== 'void' && (settings.mobile_money || settings.bank_account_number) ? (
          <View style={[s.box, { marginTop: 20 }]} wrap={false}>
            <Text style={[s.bold, { marginBottom: 6 }]}>How to pay · use {inv.number} as the reference</Text>
            <View style={[s.row, { gap: 24 }]}>
              {settings.mobile_money ? <View style={{ flex: 1 }}><Text style={s.label}>Mobile money</Text><Text>{settings.mobile_money}</Text></View> : null}
              {settings.bank_account_number ? (
                <View style={{ flex: 1.3 }}>
                  <Text style={s.label}>Bank transfer</Text>
                  <Text>{settings.bank_name}{settings.bank_branch ? `, ${settings.bank_branch}` : ''}</Text>
                  <Text>{settings.bank_account_name}</Text>
                  <Text style={s.bold}>A/C {settings.bank_account_number}</Text>
                  {settings.bank_swift ? <Text style={s.muted}>SWIFT {settings.bank_swift}</Text> : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {inv.notes ? <Text style={[s.muted, { marginTop: 14 }]}>{inv.notes}</Text> : null}
        {settings.invoice_footer ? <Text style={[s.muted, { marginTop: 18, textAlign: 'center' }]}>{settings.invoice_footer}</Text> : null}

        <View style={s.stripe} fixed>
          <View style={{ flex: 3, backgroundColor: C.indigo }} />
          <View style={{ flex: 1, backgroundColor: C.saffron }} />
          <View style={{ flex: 1, backgroundColor: C.coral }} />
        </View>
      </Page>
    </Document>
  );
}

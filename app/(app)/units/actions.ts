"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canManage, getContext } from "@/lib/context";
import { done, fail, friendly } from "@/lib/flash";
import { parseKsh, periodOf } from "@/lib/money";

const uuid = z.uuid();
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function addProperty(fd: FormData) {
  const { supabase, org } = await getContext();
  const name = str(fd.get("name"));
  if (name.length < 1 || name.length > 120) fail("/units", "Enter a property name");
  const { error } = await supabase.from("properties").insert({ org_id: org.id, name, location: str(fd.get("location")) || null });
  if (error) fail("/units", friendly(error));
  revalidatePath("/units");
  done("/units", `${name} added`);
}

export async function addUnit(fd: FormData) {
  const { supabase, org } = await getContext();
  const property = uuid.safeParse(fd.get("property_id"));
  const label = str(fd.get("label")).toUpperCase();
  const rent = parseKsh(fd.get("rent"));
  if (!property.success) fail("/units", "Choose a property");
  if (!/^[A-Z0-9][A-Z0-9 -]{0,19}$/.test(label)) fail("/units", "Unit label: letters and numbers, e.g. A1");
  if (!rent) fail("/units", "Enter the monthly rent");
  const { error } = await supabase.from("units").insert({ org_id: org.id, property_id: property.data, label, default_rent: rent });
  if (error) fail("/units", error.code === "23505" ? `A unit called ${label} already exists` : friendly(error));
  revalidatePath("/units");
  done("/units", `Unit ${label} added — account ${org.account_prefix}-${label}`);
}

export async function updateUnit(fd: FormData) {
  const { supabase } = await getContext();
  const id = uuid.parse(fd.get("unit_id"));
  const back = `/units/${id}`;
  const label = str(fd.get("label")).toUpperCase();
  const rent = parseKsh(fd.get("rent"));
  if (!/^[A-Z0-9][A-Z0-9 -]{0,19}$/.test(label)) fail(back, "Unit label: letters and numbers, e.g. A1");
  if (!rent) fail(back, "Enter the monthly rent");
  const { error } = await supabase.from("units").update({ label, default_rent: rent }).eq("id", id);
  if (error) fail(back, error.code === "23505" ? `A unit called ${label} already exists` : friendly(error));
  revalidatePath(back);
  done(back, "Unit updated");
}

export async function deleteUnit(fd: FormData) {
  const { supabase } = await getContext();
  const id = uuid.parse(fd.get("unit_id"));
  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) fail(`/units/${id}`, error.code === "23503" ? "This unit has lease history, so it can't be deleted" : friendly(error));
  revalidatePath("/units");
  done("/units", "Unit deleted");
}

const MoveIn = z.object({
  unit_id: z.uuid(),
  full_name: z.string().trim().min(2, "Enter the tenant's name").max(120),
  phone: z.string().trim().regex(/^(\+?254|0)?[17]\d{8}$/, "Enter a Kenyan phone number, e.g. 0712 345 678")
    .or(z.literal("")),
  language: z.enum(["en", "sw"]),
  start_date: z.iso.date(),
});

export async function moveIn(fd: FormData) {
  const { supabase, org, role } = await getContext();
  const raw = Object.fromEntries(["unit_id", "full_name", "phone", "language", "start_date"].map((k) => [k, str(fd.get(k))]));
  raw.phone = raw.phone.replace(/[\s-]/g, "");
  const p = MoveIn.safeParse(raw);
  const back = `/units/${raw.unit_id}`;
  if (!p.success) fail(back, p.error.issues[0].message);
  const rent = parseKsh(fd.get("rent"));
  const deposit = str(fd.get("deposit")) ? parseKsh(fd.get("deposit")) : 0;
  if (!rent) fail(back, "Enter the monthly rent");
  if (deposit === null) fail(back, "Deposit must be an amount");

  const { data: tenant, error: te } = await supabase.from("tenants")
    .insert({ org_id: org.id, full_name: p.data.full_name, phone: p.data.phone || null, language: p.data.language })
    .select("id").single();
  if (te) fail(back, friendly(te));

  const { error: le } = await supabase.from("leases").insert({
    org_id: org.id, unit_id: p.data.unit_id, tenant_id: tenant.id, rent, deposit, start_date: p.data.start_date,
  });
  if (le) {
    await supabase.from("tenants").delete().eq("id", tenant.id);
    fail(back, le.code === "23505" ? "This unit already has an active tenant" : friendly(le));
  }
  // raise this month's invoice straight away (idempotent)
  if (canManage(role) && p.data.start_date <= new Date().toISOString().slice(0, 10)) {
    await supabase.rpc("generate_invoices", { p_org: org.id, p_period: periodOf() });
  }
  revalidatePath(back);
  done(back, `${p.data.full_name} moved in`);
}

export async function updateTenant(fd: FormData) {
  const { supabase } = await getContext();
  const unitId = uuid.parse(fd.get("unit_id"));
  const back = `/units/${unitId}`;
  const phone = str(fd.get("phone")).replace(/[\s-]/g, "");
  const p = MoveIn.pick({ full_name: true, phone: true, language: true })
    .safeParse({ full_name: str(fd.get("full_name")), phone, language: str(fd.get("language")) });
  if (!p.success) fail(back, p.error.issues[0].message);
  const { error } = await supabase.from("tenants")
    .update({ full_name: p.data.full_name, phone: p.data.phone || null, language: p.data.language })
    .eq("id", uuid.parse(fd.get("tenant_id")));
  if (error) fail(back, friendly(error));
  revalidatePath(back);
  done(back, "Tenant details saved");
}

export async function changeRent(fd: FormData) {
  const { supabase } = await getContext();
  const unitId = uuid.parse(fd.get("unit_id"));
  const back = `/units/${unitId}`;
  const rent = parseKsh(fd.get("rent"));
  if (!rent) fail(back, "Enter the new monthly rent");
  const { error } = await supabase.from("leases").update({ rent }).eq("id", uuid.parse(fd.get("lease_id")));
  if (error) fail(back, friendly(error));
  revalidatePath(back);
  done(back, "Rent updated — applies from the next invoice");
}

export async function endLease(fd: FormData) {
  const { supabase } = await getContext();
  const unitId = uuid.parse(fd.get("unit_id"));
  const back = `/units/${unitId}`;
  const end = z.iso.date().safeParse(str(fd.get("end_date")));
  if (!end.success) fail(back, "Choose the move-out date");
  const { error } = await supabase.from("leases").update({ status: "ended", end_date: end.data })
    .eq("id", uuid.parse(fd.get("lease_id")));
  if (error) fail(back, error.code === "23514" ? "Move-out can't be before move-in" : friendly(error));
  revalidatePath(back);
  done(back, "Lease ended — the unit is now vacant");
}

export async function recordPayment(fd: FormData) {
  const { supabase } = await getContext();
  const unitId = uuid.parse(fd.get("unit_id"));
  const back = `/units/${unitId}`;
  const amount = parseKsh(fd.get("amount"));
  const source = str(fd.get("source")) === "bank" ? "bank" : "cash";
  if (!amount) fail(back, "Enter the amount received");
  const date = str(fd.get("received_on"));
  const receivedAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00+03:00` : null;
  const { data, error } = await supabase.rpc("record_cash_payment", {
    p_lease: uuid.parse(fd.get("lease_id")), p_amount: amount, p_ref: str(fd.get("ref")) || null,
    p_source: source, p_received_at: receivedAt,
  });
  if (error) fail(back, friendly(error));
  const r = Array.isArray(data) ? data[0] : data;
  revalidatePath(back);
  if (r?.duplicate) fail(back, `Reference already used — that payment was recorded earlier (${r.receipt_no})`);
  done(back, `Payment recorded · receipt ${r?.receipt_no}`);
}

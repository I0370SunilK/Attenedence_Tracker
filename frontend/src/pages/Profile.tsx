import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { changePassword, sendDeletionRequest, getDeletionRequestStatus, updateProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { LogOut, Trash2, Mail, MapPin, Briefcase, Users, IdCard, KeyRound, Pencil, Save, X, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DESIGNATIONS, Employee } from "@/lib/types";

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Employee | null>(user);
  const [saving, setSaving] = useState(false);

  // password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [deleteRequestStatus, setDeleteRequestStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [deleteRequestBusy, setDeleteRequestBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDraft(user);
    getDeletionRequestStatus(user.employeeId)
      .then((request) => setDeleteRequestStatus(request.status as "pending" | "approved" | "rejected"))
      .catch(() => setDeleteRequestStatus("none"));
  }, [user]);

  if (!user || !draft) return null;

  const initials = draft.fullName.split(" ").map(n => n[0]).slice(0, 2).join("");

  const save = async () => {
    if (!draft) return;

    setSaving(true);
    try {
      const updated = await updateProfile({
        designation: draft.designation,
        team: draft.team,
        email: draft.email,
        city: draft.city,
      });
      setDraft(updated);
      setUser(updated);
      setEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setDraft(user); setEditing(false); };

  const changePw = async () => {
    if (!pw.current || !pw.next || !pw.confirm) return toast.error("Fill all fields");
    if (pw.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match");

    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwOpen(false);
      toast.success("Password changed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      toast.error(message);
    } finally {
      setPwBusy(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!user) return;
    setDeleteRequestBusy(true);
    try {
      await sendDeletionRequest(user.employeeId);
      setDeleteRequestStatus("pending");
      toast.success("Deletion request sent to admin");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send deletion request";
      toast.error(message);
    } finally {
      setDeleteRequestBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl w-full">
      <div className="card-soft overflow-hidden relative">
        <div className="h-32 bg-gradient-primary" />
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title="Edit profile"
            onClick={() => setEditing(true)}
            className="rounded-full bg-white/10 text-white shadow-lg shadow-black/10 border border-white/10 hover:bg-white/20 transition"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Change password"
                className="rounded-full bg-white/10 text-white shadow-lg shadow-black/10 border border-white/10 hover:bg-white/20 transition"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
                <DialogDescription>Use at least 8 characters.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Field label="Current password" type="password" value={pw.current} onChange={v => setPw({ ...pw, current: v })} />
                <Field label="New password" type="password" value={pw.next} onChange={v => setPw({ ...pw, next: v })} />
                <Field label="Confirm new password" type="password" value={pw.confirm} onChange={v => setPw({ ...pw, confirm: v })} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={pwBusy}>Cancel</Button>
                <Button onClick={changePw} disabled={pwBusy}>Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Delete account"
                aria-label="Delete account"
                disabled={deleteRequestBusy || deleteRequestStatus === "pending" || deleteRequestStatus === "approved"}
                className="rounded-full bg-destructive text-white shadow-lg shadow-black/10 border border-white/10 hover:bg-destructive/90 transition"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deletion isn't immediate. A request will be sent to your admin for approval.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRequest}>
                  Send Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="ghost"
            size="icon"
            title="Logout"
            onClick={() => {
              logout();
              toast.success("Signed out");
              nav("/login");
            }}
            className="rounded-full bg-white/10 text-white shadow-lg shadow-black/10 border border-white/10 hover:bg-white/20 transition"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 sm:px-8 pb-8 -mt-16">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="shrink-0">
                <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-2xl border-4 border-card grid place-items-center text-lg sm:text-2xl font-bold text-white shadow-elevated overflow-hidden"
                  style={{ background: draft.avatarColor }}>
                  {initials}
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-3 pr-20 sm:pr-16">
                <h1 className="text-[clamp(1.06rem,4vw,1.35rem)] sm:text-[clamp(1.90rem,3.5vw,1.25rem)] md:text-[clamp(1.05rem,3vw,1.8rem)] lg:text-[clamp(1.15rem,2.5vw,2.05rem)] font-bold leading-tight text-white whitespace-nowrap max-w-full">{draft.fullName}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {!editing ? (
                <>
                  {deleteRequestStatus === "pending" && (
                    <div className="rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">
                      Your deletion request is pending admin approval.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={cancel} disabled={saving}><X className="h-4 w-4 mr-2" /> Cancel</Button>
                  <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save changes"}</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Detail icon={IdCard} label="Employee ID" value={draft.employeeId} editing={false} onChange={() => {}} />
        <Detail icon={Briefcase} label="Designation" value={draft.designation}
          editing={editing} onChange={v => setDraft({ ...draft, designation: v as Employee["designation"] })} selectOptions={DESIGNATIONS} />
        <Detail icon={Users} label="Team" value={draft.team}
          editing={editing} onChange={v => setDraft({ ...draft, team: v })} />
        <Detail icon={Mail} label="Email" value={draft.email}
          editing={editing} onChange={v => setDraft({ ...draft, email: v })} />
        <Detail icon={MapPin} label="City" value={draft.city}
          editing={editing} onChange={v => setDraft({ ...draft, city: v })} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  editing,
  onChange,
  selectOptions,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  selectOptions?: string[];
}) {
  return (
<div className="card-soft overflow-hidden p-3 sm:p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="rounded-2xl border border-card p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-semibold text-foreground">{value}</p>
        </div>
      </div>

      {editing ? (
        selectOptions ? (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full"
          />
        )
      ) : null}
    </div>
  );
}

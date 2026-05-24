import { useEffect, useRef, useState } from "react";
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
import { LogOut, Trash2, Mail, MapPin, Briefcase, Users, IdCard, Camera, KeyRound, Pencil, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DESIGNATIONS, Employee } from "@/lib/types";

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Employee | null>(user);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatar(url);
    toast.success("Avatar updated");
  };

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
    <div className="space-y-8 max-w-4xl">
      <div className="card-soft overflow-hidden">
        <div className="h-28 bg-gradient-primary" />
        <div className="px-6 sm:px-8 pb-8 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl border-4 border-card grid place-items-center text-2xl font-bold text-white shadow-elevated overflow-hidden"
                  style={{ background: avatar ? undefined : draft.avatarColor }}>
                  {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card border border-border shadow grid place-items-center hover:bg-muted transition-colors"
                  aria-label="Change avatar">
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
              </div>
              <div className="pb-2">
                <h1 className="text-2xl font-bold">{draft.fullName}</h1>
                <p className="text-sm text-muted-foreground">{draft.designation} · {draft.team}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Profile
                  </Button>
                  <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline"><KeyRound className="h-4 w-4 mr-2" /> Change Password</Button>
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
                  <Button variant="ghost" onClick={() => { logout(); toast.success("Signed out"); nav("/login"); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                  {deleteRequestStatus === "pending" && (
                    <div className="rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">
                      Your deletion request is pending admin approval.
                    </div>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Delete account"
                        disabled={deleteRequestBusy || deleteRequestStatus === "pending" || deleteRequestStatus === "approved"}
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

      <div className="grid sm:grid-cols-2 gap-4">
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
  icon: Icon, label, value, editing, onChange, selectOptions,
}: { icon: any; label: string; value: string; editing: boolean; onChange: (v: string) => void; selectOptions?: string[] }) {
  return (
    <div className="card-soft p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        {editing ? (
          selectOptions ? (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="h-8 mt-1 text-sm">
                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 mt-1 text-sm" />
          )
        ) : (
          <p className="font-medium truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

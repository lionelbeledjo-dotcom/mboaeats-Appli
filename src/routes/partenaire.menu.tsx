import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  getRestaurantMenu, upsertCategory, deleteCategory, upsertDish, deleteDish,
} from "@/server/restaurant.functions";
import { usePartenaire } from "@/components/partenaire/PartenaireContext";

export const Route = createFileRoute("/partenaire/menu")({
  component: MenuPage,
});

type Cat = { id: string; name: string; sort_order: number | null };
type Dish = {
  id: string; category_id: string | null; name: string; description: string | null;
  price: number; image_url: string | null; is_available: boolean | null; is_popular: boolean | null;
};

function MenuPage() {
  const { active } = usePartenaire();
  const fetchMenu = useServerFn(getRestaurantMenu);
  const saveCat = useServerFn(upsertCategory);
  const removeCat = useServerFn(deleteCategory);
  const saveDish = useServerFn(upsertDish);
  const removeDish = useServerFn(deleteDish);

  const [cats, setCats] = useState<Cat[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Dish> | null>(null);
  const [editingCat, setEditingCat] = useState<Partial<Cat> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchMenu({ data: { restaurant_id: active.id } });
      setCats(r.categories as Cat[]);
      setDishes(r.dishes as Dish[]);
    } finally { setLoading(false); }
  }, [fetchMenu, active.id]);

  useEffect(() => { reload(); }, [reload]);

  const grouped = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const d of dishes) {
      const k = d.category_id ?? "_";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    return m;
  }, [dishes]);

  const toggleAvail = async (d: Dish) => {
    setDishes((cur) => cur.map((x) => (x.id === d.id ? { ...x, is_available: !x.is_available } : x)));
    try {
      await saveDish({
        data: {
          id: d.id, restaurant_id: active.id, name: d.name,
          price: d.price, category_id: d.category_id,
          description: d.description, image_url: d.image_url || undefined,
          is_available: !d.is_available, is_popular: d.is_popular ?? false,
        },
      });
    } catch {
      toast.error("Action impossible");
      reload();
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Menu</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingCat({ name: "" })}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold hover:border-primary/40"
          >
            <Plus className="h-3.5 w-3.5" /> Catégorie
          </button>
          <button
            onClick={() => setEditing({ name: "", price: 0, is_available: true })}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau plat
          </button>
        </div>
      </div>

      {cats.length === 0 && dishes.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez votre première catégorie puis ajoutez vos plats.
        </p>
      )}

      <div className="space-y-6">
        {cats.map((cat) => (
          <section key={cat.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">{cat.name}</h3>
              <div className="flex gap-1">
                <IconBtn onClick={() => setEditingCat(cat)} icon={Pencil} />
                <IconBtn
                  onClick={async () => {
                    if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return;
                    await removeCat({ data: { id: cat.id, restaurant_id: active.id } });
                    toast.success("Catégorie supprimée");
                    reload();
                  }}
                  icon={Trash2}
                  danger
                />
              </div>
            </div>
            <ul className="grid gap-2 lg:grid-cols-2">
              {(grouped.get(cat.id) ?? []).map((d) => (
                <DishRow
                  key={d.id}
                  dish={d}
                  onEdit={() => setEditing(d)}
                  onToggle={() => toggleAvail(d)}
                  onDelete={async () => {
                    if (!confirm(`Supprimer ${d.name} ?`)) return;
                    await removeDish({ data: { id: d.id, restaurant_id: active.id } });
                    toast.success("Plat supprimé");
                    reload();
                  }}
                />
              ))}
            </ul>
          </section>
        ))}
        {(grouped.get("_") ?? []).length > 0 && (
          <section>
            <h3 className="mb-2 font-display text-base font-bold text-muted-foreground">Sans catégorie</h3>
            <ul className="grid gap-2 lg:grid-cols-2">
              {(grouped.get("_") ?? []).map((d) => (
                <DishRow
                  key={d.id}
                  dish={d}
                  onEdit={() => setEditing(d)}
                  onToggle={() => toggleAvail(d)}
                  onDelete={async () => {
                    await removeDish({ data: { id: d.id, restaurant_id: active.id } });
                    reload();
                  }}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      {editing && (
        <DishModal
          initial={editing}
          categories={cats}
          onClose={() => setEditing(null)}
          onSave={async (d) => {
            await saveDish({
              data: {
                id: d.id, restaurant_id: active.id,
                category_id: d.category_id ?? null,
                name: d.name!, description: d.description ?? null,
                price: d.price ?? 0, image_url: d.image_url || undefined,
                is_available: d.is_available ?? true,
                is_popular: d.is_popular ?? false,
              },
            });
            toast.success(d.id ? "Plat mis à jour" : "Plat créé");
            setEditing(null);
            reload();
          }}
        />
      )}

      {editingCat && (
        <CategoryModal
          initial={editingCat}
          onClose={() => setEditingCat(null)}
          onSave={async (c) => {
            await saveCat({
              data: { id: c.id, restaurant_id: active.id, name: c.name!, sort_order: c.sort_order ?? 0 },
            });
            toast.success(c.id ? "Catégorie mise à jour" : "Catégorie créée");
            setEditingCat(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  onClick, icon: Icon, danger,
}: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-1.5 ${danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function DishRow({
  dish, onEdit, onDelete, onToggle,
}: {
  dish: Dish; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">
        {dish.image_url && (
          <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{dish.name}</p>
          {!dish.is_available && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Indispo</span>
          )}
        </div>
        <p className="text-xs text-primary">{dish.price.toLocaleString("fr-FR")} F</p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
        <input type="checkbox" checked={!!dish.is_available} onChange={onToggle} className="h-3.5 w-3.5 accent-primary" />
        Dispo
      </label>
      <IconBtn onClick={onEdit} icon={Pencil} />
      <IconBtn onClick={onDelete} icon={Trash2} danger />
    </li>
  );
}

function Modal({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function DishModal({
  initial, categories, onClose, onSave,
}: {
  initial: Partial<Dish>; categories: Cat[];
  onClose: () => void; onSave: (d: Partial<Dish>) => Promise<void>;
}) {
  const [d, setD] = useState<Partial<Dish>>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={initial.id ? "Modifier le plat" : "Nouveau plat"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nom" value={d.name ?? ""} onChange={(v) => setD({ ...d, name: v })} />
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Description</span>
          <textarea
            value={d.description ?? ""}
            onChange={(e) => setD({ ...d, description: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Prix (FCFA)"
            type="number"
            value={String(d.price ?? 0)}
            onChange={(v) => setD({ ...d, price: parseInt(v) || 0 })}
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Catégorie</span>
            <select
              value={d.category_id ?? ""}
              onChange={(e) => setD({ ...d, category_id: e.target.value || null })}
              className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm"
            >
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <Field
          label="Image URL"
          value={d.image_url ?? ""}
          onChange={(v) => setD({ ...d, image_url: v || null })}
          placeholder="https://…"
        />
        <div className="flex gap-3">
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={d.is_available ?? true}
              onChange={(e) => setD({ ...d, is_available: e.target.checked })}
              className="accent-primary"
            />
            Disponible
          </label>
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={d.is_popular ?? false}
              onChange={(e) => setD({ ...d, is_popular: e.target.checked })}
              className="accent-primary"
            />
            Populaire
          </label>
        </div>
        <button
          disabled={saving || !d.name?.trim()}
          onClick={async () => {
            setSaving(true);
            try { await onSave(d); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
            finally { setSaving(false); }
          }}
          className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

function CategoryModal({
  initial, onClose, onSave,
}: {
  initial: Partial<Cat>; onClose: () => void; onSave: (c: Partial<Cat>) => Promise<void>;
}) {
  const [c, setC] = useState<Partial<Cat>>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={initial.id ? "Modifier la catégorie" : "Nouvelle catégorie"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nom" value={c.name ?? ""} onChange={(v) => setC({ ...c, name: v })} />
        <button
          disabled={saving || !c.name?.trim()}
          onClick={async () => {
            setSaving(true);
            try { await onSave(c); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
            finally { setSaving(false); }
          }}
          className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

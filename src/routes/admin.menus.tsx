import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, Plus, Pencil, Trash2, Search, Save, Image as ImageIcon, Upload,
  Star, ToggleLeft, ToggleRight, FolderTree, Utensils, Store as StoreIcon,
} from "lucide-react";
import { listAllRestaurants } from "@/server/admin.functions";
import {
  listMenuCategories, createMenuCategory, updateMenuCategory, deleteMenuCategory,
  listDishes, createDish, updateDish, deleteDish, uploadDishImage,
} from "@/server/admin-menus.functions";
import { Modal, Field, inputCls } from "@/components/admin/Modal";
import { ErrorState } from "@/components/admin/ErrorState";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/menus")({
  head: () => ({ meta: [{ title: "Menus & Catégories · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: MenusPage,
});

type Resto = { id: string; name: string; city: string };
type Category = { id: string; restaurant_id: string; name: string; sort_order: number | null };
type Dish = {
  id: string; restaurant_id: string; category_id: string | null; name: string;
  description: string | null; price: number; image_url: string | null;
  is_available: boolean | null; is_popular: boolean | null; sort_order: number | null;
};

const MOCK_RESTOS: Resto[] = [
  { id: "mock-resto-1", name: "Restaurant de démo", city: "Douala" },
];
const MOCK_CATS = (rid: string): Category[] => [
  { id: "mc-ent", restaurant_id: rid, name: "Entrées",  sort_order: 1 },
  { id: "mc-pla", restaurant_id: rid, name: "Plats",    sort_order: 2 },
  { id: "mc-boi", restaurant_id: rid, name: "Boissons", sort_order: 3 },
];
const MOCK_DISHES = (rid: string): Dish[] => [
  { id: "md1", restaurant_id: rid, category_id: "mc-ent", name: "Salade Mboa",     description: "Salade fraîche, vinaigrette maison.",      price: 2500, image_url: null, is_available: true,  is_popular: false, sort_order: 1 },
  { id: "md2", restaurant_id: rid, category_id: "mc-pla", name: "Ndolè royal",     description: "Ndolè aux crevettes et viande de bœuf.",   price: 5500, image_url: null, is_available: true,  is_popular: true,  sort_order: 1 },
  { id: "md3", restaurant_id: rid, category_id: "mc-pla", name: "Poulet DG",       description: "Poulet sauté, plantains et légumes.",      price: 6000, image_url: null, is_available: true,  is_popular: true,  sort_order: 2 },
  { id: "md4", restaurant_id: rid, category_id: "mc-pla", name: "Poisson braisé",  description: "Bar braisé, miondo et sauce piment.",      price: 7000, image_url: null, is_available: false, is_popular: false, sort_order: 3 },
  { id: "md5", restaurant_id: rid, category_id: "mc-boi", name: "Jus de bissap",   description: "Boisson glacée à l'hibiscus.",             price: 1000, image_url: null, is_available: true,  is_popular: false, sort_order: 1 },
];

function MenusPage() {
  const fetchRestos = useServerFn(listAllRestaurants);
  const fetchCats = useServerFn(listMenuCategories);
  const fetchDishes = useServerFn(listDishes);
  const createCat = useServerFn(createMenuCategory);
  const updateCat = useServerFn(updateMenuCategory);
  const deleteCat = useServerFn(deleteMenuCategory);
  const createDishFn = useServerFn(createDish);
  const updateDishFn = useServerFn(updateDish);
  const deleteDishFn = useServerFn(deleteDish);

  const [restos, setRestos] = useState<Resto[] | null>(null);
  const [restoId, setRestoId] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[] | null>(null);
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<Category | "new" | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | "new" | null>(null);

  // Load restaurants
  useEffect(() => {
    fetchRestos()
      .then((r) => {
        const list = (r.restaurants ?? []) as Resto[];
        const safe = list.length > 0 ? list : MOCK_RESTOS;
        setRestos(safe);
        if (safe.length && !restoId) setRestoId(safe[0].id);
      })
      .catch(() => {
        setRestos(MOCK_RESTOS);
        if (!restoId) setRestoId(MOCK_RESTOS[0].id);
      });
    // eslint-disable-next-line
  }, []);

  const reload = async (id: string) => {
    setError(null);
    setCats(null);
    setDishes(null);
    try {
      const [c, d] = await Promise.all([
        fetchCats({ data: { restaurant_id: id } }),
        fetchDishes({ data: { restaurant_id: id } }),
      ]);
      const cs = (c.categories ?? []) as Category[];
      const ds = (d.dishes ?? []) as Dish[];
      if (cs.length === 0 && ds.length === 0) {
        setCats(MOCK_CATS(id));
        setDishes(MOCK_DISHES(id));
      } else {
        setCats(cs);
        setDishes(ds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
      setCats(MOCK_CATS(id));
      setDishes(MOCK_DISHES(id));
    }
  };

  useEffect(() => {
    if (!restoId) return;
    reload(restoId);
    const ch = supabase
      .channel(`admin-menus-${restoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes", filter: `restaurant_id=eq.${restoId}` }, () => reload(restoId))
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories", filter: `restaurant_id=eq.${restoId}` }, () => reload(restoId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [restoId]);

  const catMap = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c.name])), [cats]);

  const filteredDishes = useMemo(() => {
    return (dishes ?? []).filter((d) => {
      if (catFilter !== "all" && d.category_id !== catFilter) return false;
      if (q && !d.name.toLowerCase().includes(q.toLowerCase()) && !(d.description ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [dishes, q, catFilter]);

  const restoSearch = useMemo(() => (restos ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)), [restos]);

  const handleDeleteCat = async (c: Category) => {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ? Les plats seront détachés (non supprimés).`)) return;
    if (c.id.startsWith("mc-")) {
      setCats((cur) => (cur ?? []).filter((x) => x.id !== c.id));
      setDishes((cur) => (cur ?? []).map((d) => (d.category_id === c.id ? { ...d, category_id: null } : d)));
      toast.success("Catégorie supprimée (démo)");
      return;
    }
    try {
      await deleteCat({ data: { id: c.id } });
      toast.success("Catégorie supprimée");
      setCats((cur) => (cur ?? []).filter((x) => x.id !== c.id));
      setDishes((cur) => (cur ?? []).map((d) => (d.category_id === c.id ? { ...d, category_id: null } : d)));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };

  const handleDeleteDish = async (d: Dish) => {
    if (!confirm(`Supprimer le plat « ${d.name} » ?`)) return;
    if (d.id.startsWith("md")) {
      setDishes((cur) => (cur ?? []).filter((x) => x.id !== d.id));
      toast.success("Plat supprimé (démo)");
      return;
    }
    try {
      await deleteDishFn({ data: { id: d.id } });
      toast.success("Plat supprimé");
      setDishes((cur) => (cur ?? []).filter((x) => x.id !== d.id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };

  const toggleDishField = async (d: Dish, field: "is_available" | "is_popular") => {
    const next = !d[field];
    setDishes((cur) => (cur ?? []).map((x) => (x.id === d.id ? { ...x, [field]: next } : x)));
    try { await updateDishFn({ data: { id: d.id, [field]: next } as any }); }
    catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      setDishes((cur) => (cur ?? []).map((x) => (x.id === d.id ? { ...x, [field]: !next } : x)));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Menus & Catégories</h1>
          <p className="text-sm text-muted-foreground">CRUD complet des plats et catégories par restaurant.</p>
        </div>
        <div className="flex items-center gap-2">
          <StoreIcon className="h-4 w-4 text-muted-foreground" />
          <select
            value={restoId ?? ""}
            onChange={(e) => setRestoId(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none"
            disabled={!restos}
          >
            {!restos && <option>Chargement…</option>}
            {restoSearch.map((r) => (
              <option key={r.id} value={r.id}>{r.name} · {r.city}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Données indisponibles ({error}). Affichage de menus de démonstration.
        </div>
      )}

      {/* Categories */}
      <section className="rounded-3xl border border-border bg-surface/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <FolderTree className="h-5 w-5 text-primary" /> Catégories ({cats?.length ?? 0})
          </h2>
          <button
            onClick={() => setEditingCat("new")}
            disabled={!restoId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvelle catégorie
          </button>
        </div>
        {!cats ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : cats.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
            Aucune catégorie. Créez-en une pour organiser le menu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const count = (dishes ?? []).filter((d) => d.category_id === c.id).length;
              return (
                <div key={c.id} className="group flex items-center gap-2 rounded-2xl border border-border bg-background/50 px-3 py-2 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{count}</span>
                  <button onClick={() => setEditingCat(c)} className="text-muted-foreground hover:text-foreground" title="Éditer">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCat(c)} className="text-muted-foreground hover:text-destructive" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dishes */}
      <section className="rounded-3xl border border-border bg-surface/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Utensils className="h-5 w-5 text-primary" /> Plats ({dishes?.length ?? 0})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-sm">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="w-40 bg-transparent outline-none" />
            </div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none"
            >
              <option value="all">Toutes catégories</option>
              {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="">(Sans catégorie)</option>
            </select>
            <button
              onClick={() => setEditingDish("new")}
              disabled={!restoId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Nouveau plat
            </button>
          </div>
        </div>

        {!dishes ? (
          <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filteredDishes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/40 p-10 text-center text-sm text-muted-foreground">
            Aucun plat ne correspond.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDishes.map((d) => (
              <div key={d.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background/50">
                <div className="relative aspect-[4/3] bg-gradient-primary/10">
                  {d.image_url ? (
                    <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  {d.is_popular && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold/90 px-2 py-0.5 text-[10px] font-bold text-background">
                      <Star className="h-3 w-3 fill-background" /> Populaire
                    </span>
                  )}
                  {!d.is_available && (
                    <span className="absolute right-2 top-2 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                      Indisponible
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm font-bold leading-tight">{d.name}</h3>
                    <span className="whitespace-nowrap text-sm font-bold text-primary">{d.price.toLocaleString("fr-FR")} F</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {d.category_id ? catMap.get(d.category_id) ?? "—" : "Sans catégorie"}
                  </p>
                  {d.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
                  )}
                  <div className="mt-auto grid grid-cols-2 gap-1.5 pt-3">
                    <button
                      onClick={() => toggleDishField(d, "is_available")}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold hover:bg-background"
                      title="Disponibilité"
                    >
                      {d.is_available ? <ToggleRight className="h-3.5 w-3.5 text-emerald-400" /> : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                      Dispo
                    </button>
                    <button
                      onClick={() => toggleDishField(d, "is_popular")}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold hover:bg-background"
                      title="Populaire"
                    >
                      <Star className={`h-3.5 w-3.5 ${d.is_popular ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                      Pop
                    </button>
                    <button
                      onClick={() => setEditingDish(d)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold hover:bg-background"
                    >
                      <Pencil className="h-3 w-3" /> Éditer
                    </button>
                    <button
                      onClick={() => handleDeleteDish(d)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[10px] font-bold text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="h-3 w-3" /> Suppr.
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingCat && restoId && (
        <CategoryModal
          mode={editingCat === "new" ? "create" : "edit"}
          initial={editingCat === "new" ? null : editingCat}
          onClose={() => setEditingCat(null)}
          onSave={async (values) => {
            if (editingCat === "new") {
              const r = await createCat({ data: { restaurant_id: restoId, ...values } });
              setCats((cur) => [...(cur ?? []), r.category as Category].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
              toast.success("Catégorie créée");
            } else {
              await updateCat({ data: { id: editingCat.id, ...values } });
              setCats((cur) => (cur ?? []).map((x) => (x.id === editingCat.id ? { ...x, ...values } : x)));
              toast.success("Catégorie mise à jour");
            }
            setEditingCat(null);
          }}
        />
      )}

      {editingDish && restoId && (
        <DishModal
          mode={editingDish === "new" ? "create" : "edit"}
          initial={editingDish === "new" ? null : editingDish}
          categories={cats ?? []}
          restaurantId={restoId}
          onClose={() => setEditingDish(null)}
          onSave={async (values) => {
            if (editingDish === "new") {
              const r = await createDishFn({ data: { restaurant_id: restoId, ...values } });
              setDishes((cur) => [r.dish as Dish, ...(cur ?? [])]);
              toast.success("Plat créé");
            } else {
              await updateDishFn({ data: { id: editingDish.id, ...values } });
              setDishes((cur) => (cur ?? []).map((x) => (x.id === editingDish.id ? { ...x, ...values } as Dish : x)));
              toast.success("Plat mis à jour");
            }
            setEditingDish(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({ mode, initial, onClose, onSave }: {
  mode: "create" | "edit";
  initial: Category | null;
  onClose: () => void;
  onSave: (values: { name: string; sort_order: number }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) { toast.error("Nom requis"); return; }
    setSaving(true);
    try { await onSave({ name: name.trim(), sort_order: Number(sortOrder) || 0 }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={mode === "create" ? "Nouvelle catégorie" : `Éditer · ${initial?.name}`} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Annuler</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </>
    }>
      <div className="space-y-4">
        <Field label="Nom"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <Field label="Ordre d'affichage"><input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} min={0} max={999} /></Field>
      </div>
    </Modal>
  );
}

function DishModal({ mode, initial, categories, restaurantId, onClose, onSave }: {
  mode: "create" | "edit";
  initial: Dish | null;
  categories: Category[];
  restaurantId: string;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
}) {
  const upload = useServerFn(uploadDishImage);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState<number>(initial?.price ?? 0);
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? "");
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url ?? "");
  const [isAvailable, setIsAvailable] = useState<boolean>(initial?.is_available ?? true);
  const [isPopular, setIsPopular] = useState<boolean>(initial?.is_popular ?? false);
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("restaurant_id", restaurantId);
      const r = await upload({ data: fd });
      setImageUrl(r.url);
      toast.success("Image téléchargée");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur upload"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!name.trim()) { toast.error("Nom requis"); return; }
    if (price < 0) { toast.error("Prix invalide"); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price) || 0,
        category_id: categoryId || null,
        image_url: imageUrl || null,
        is_available: isAvailable,
        is_popular: isPopular,
        sort_order: Number(sortOrder) || 0,
      });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={mode === "create" ? "Nouveau plat" : `Éditer · ${initial?.name}`} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Annuler</button>
        <button onClick={submit} disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </>
    }>
      <div className="space-y-4">
        {/* Image uploader */}
        <div>
          <p className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photo</p>
          <div className="flex items-start gap-3">
            <div className="relative aspect-square w-28 overflow-hidden rounded-xl border border-border bg-background/40">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-surface disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" /> {imageUrl ? "Remplacer" : "Téléverser"} (JPG/PNG, max 5 Mo)
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="block text-xs text-destructive hover:underline"
                >
                  Retirer la photo
                </button>
              )}
              <input
                className={inputCls}
                placeholder="…ou colle une URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
          <Field label="Prix (FCFA)"><input type="number" className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value))} min={0} /></Field>
          <Field label="Catégorie">
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Ordre"><input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} min={0} /></Field>
        </div>

        <Field label="Description">
          <textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </Field>

        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
            Disponible
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm">
            <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} />
            Populaire
          </label>
        </div>
      </div>
    </Modal>
  );
}

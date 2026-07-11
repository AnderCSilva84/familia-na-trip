import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Trash2,
  Play,
  Users,
  CalendarCheck,
  Star,
  History,
} from "lucide-react";
import { Button, Card, EmptyState, StarCounter } from "../components/ui";
import { categories, defaultSettings } from "../constants";
import { useAuth } from "../contexts/AuthContext";
import {
  childrenApi,
  executionsApi,
  loadSettings,
  routinesApi,
  saveSettings,
} from "../services/dataService";
import type { Child, Execution, Routine, SensorySettings } from "../types";
export function Dashboard() {
  const { user } = useAuth();
  const [c, setC] = useState<Child[]>([]);
  const [r, setR] = useState<Routine[]>([]);
  const [e, setE] = useState<Execution[]>([]);
  useEffect(() => {
    if (user)
      Promise.all([
        childrenApi.list(user.uid),
        routinesApi.list(user.uid),
        executionsApi.list(user.uid),
      ]).then(([a, b, d]) => {
        setC(a);
        setR(b);
        setE(d);
      });
  }, [user]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <h1>Olá, família!</h1>
      <p>Vamos deixar o dia mais previsível e tranquilo.</p>
      <div className="stats">
        <Card>
          <Users />
          <strong>{c.length}</strong>
          <span>Crianças</span>
        </Card>
        <Card>
          <CalendarCheck />
          <strong>{r.filter((x) => x.isActive).length}</strong>
          <span>Rotinas ativas</span>
        </Card>
        <Card>
          <History />
          <strong>
            {
              e.filter(
                (x) => x.status === "completed" && x.executionDate === today,
              ).length
            }
          </strong>
          <span>Concluídas hoje</span>
        </Card>
        <Card>
          <Star />
          <strong>{c.reduce((n, x) => n + x.stars, 0)}</strong>
          <span>Estrelas</span>
        </Card>
      </div>
      <div className="actions">
        <Link className="button" to="/responsavel/criancas/nova">
          <Plus />
          Nova criança
        </Link>
        <Link className="button" to="/responsavel/rotinas/nova">
          <Plus />
          Nova rotina
        </Link>
      </div>
      {c.map((x) => (
        <Card key={x.id}>
          <h2>{x.nickname || x.name}</h2>
          <StarCounter value={x.stars} />
          <Link className="button" to={`/crianca/${x.id}`}>
            <Play />
            Entrar no modo criança
          </Link>
        </Card>
      ))}
    </div>
  );
}
const childSchema = z.object({
  name: z.string().min(2),
  nickname: z.string(),
  birthDate: z.string(),
  preferredColor: z.string(),
});
type ChildForm = z.infer<typeof childSchema>;
export function ChildrenPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const [list, setList] = useState<Child[]>([]);
  const { register, handleSubmit, reset } = useForm<ChildForm>({
    resolver: zodResolver(childSchema),
    defaultValues: { preferredColor: "#77c9b5" },
  });
  useEffect(() => {
    if (user)
      childrenApi.list(user.uid).then((v) => {
        setList(v);
        const found = v.find((x) => x.id === id);
        if (found) reset(found);
      });
  }, [user, id, reset]);
  if (id || location.pathname.endsWith("/nova"))
    return (
      <div>
        <h1>{id ? "Editar criança" : "Cadastrar criança"}</h1>
        <Card>
          <form
            onSubmit={handleSubmit(async (v) => {
              if (!user) return;
              if (id) await childrenApi.update(id, v);
              else
                await childrenApi.create({ ...v, userId: user.uid, stars: 0 });
              nav("/responsavel/criancas");
            })}
          >
            <label>
              Nome
              <input {...register("name")} />
            </label>
            <label>
              Como prefere ser chamada
              <input {...register("nickname")} />
            </label>
            <label>
              Data de nascimento
              <input type="date" {...register("birthDate")} />
            </label>
            <label>
              Cor preferida
              <input type="color" {...register("preferredColor")} />
            </label>
            <Button>Salvar criança</Button>
          </form>
        </Card>
      </div>
    );
  return (
    <div>
      <div className="title-row">
        <h1>Crianças</h1>
        <Link className="button" to="/responsavel/criancas/nova">
          <Plus />
          Adicionar
        </Link>
      </div>
      {list.length ? (
        list.map((x) => (
          <Card key={x.id}>
            <h2>{x.name}</h2>
            <StarCounter value={x.stars} />
            <Link to={`/responsavel/criancas/${x.id}`}>Editar dados</Link>
          </Card>
        ))
      ) : (
        <EmptyState>Cadastre a primeira criança para começar.</EmptyState>
      )}
    </div>
  );
}
const routineSchema = z.object({
  childId: z.string().min(1),
  title: z.string().min(2),
  description: z.string(),
  category: z.string(),
  startTime: z.string(),
  estimatedDuration: z.number().min(1),
  rewardStars: z.number().min(1).max(20),
  celebrationMode: z.enum(["calm", "fun", "silent"]),
  nextRoutineText: z.string(),
  isActive: z.boolean(),
  steps: z
    .array(z.object({ title: z.string().min(1), description: z.string() }))
    .min(1),
});
type RoutineFormData = z.infer<typeof routineSchema>;
export function RoutinesPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const form = useForm<RoutineFormData>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      category: "autocuidado",
      estimatedDuration: 10,
      rewardStars: 1,
      celebrationMode: "calm",
      isActive: true,
      steps: [{ title: "Fazer a atividade", description: "" }],
    },
  });
  const resetRoutine = form.reset;
  const fields = useFieldArray({ control: form.control, name: "steps" });
  useEffect(() => {
    if (user)
      Promise.all([
        childrenApi.list(user.uid),
        routinesApi.list(user.uid),
      ]).then(([c, r]) => {
        setChildren(c);
        setRoutines(r);
        const found = r.find((x) => x.id === id);
        if (found) resetRoutine({ ...found, steps: found.steps });
      });
  }, [user, id, resetRoutine]);
  if (id || location.pathname.endsWith("/nova"))
    return (
      <div>
        <h1>{id ? "Editar rotina" : "Nova rotina"}</h1>
        <Card>
          <form
            onSubmit={form.handleSubmit(async (v) => {
              if (!user) return;
              const value = {
                ...v,
                userId: user.uid,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                order: routines.length,
                steps: v.steps.map((s, i) => ({
                  ...s,
                  id: crypto.randomUUID(),
                  order: i,
                })),
              };
              if (id) await routinesApi.update(id, value);
              else await routinesApi.create(value);
              nav("/responsavel/rotinas");
            })}
          >
            <label>
              Criança
              <select {...form.register("childId")}>
                <option value="">Selecione</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título
              <input {...form.register("title")} />
            </label>
            <label>
              Descrição
              <textarea {...form.register("description")} />
            </label>
            <label>
              Categoria
              <select {...form.register("category")}>
                {categories.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid2">
              <label>
                Horário
                <input type="time" {...form.register("startTime")} />
              </label>
              <label>
                Duração (min)
                <input type="number" {...form.register("estimatedDuration", { valueAsNumber: true })} />
              </label>
              <label>
                Estrelas
                <input type="number" {...form.register("rewardStars", { valueAsNumber: true })} />
              </label>
              <label>
                Comemoração
                <select {...form.register("celebrationMode")}>
                  <option value="calm">Tranquila</option>
                  <option value="fun">Divertida</option>
                  <option value="silent">Silenciosa</option>
                </select>
              </label>
            </div>
            <label>
              Depois teremos...
              <input {...form.register("nextRoutineText")} />
            </label>
            <h2>Etapas</h2>
            {fields.fields.map((f, i) => (
              <div className="step-edit" key={f.id}>
                <input
                  aria-label={`Etapa ${i + 1}`}
                  {...form.register(`steps.${i}.title`)}
                />
                <input
                  placeholder="Instrução curta"
                  {...form.register(`steps.${i}.description`)}
                />
                <button type="button" onClick={() => fields.remove(i)}>
                  <Trash2 />
                </button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => fields.append({ title: "", description: "" })}
            >
              <Plus />
              Adicionar etapa
            </Button>
            <label className="check">
              <input type="checkbox" {...form.register("isActive")} />
              Rotina ativa
            </label>
            <Button>Salvar rotina</Button>
          </form>
        </Card>
      </div>
    );
  return (
    <div>
      <div className="title-row">
        <h1>Rotinas</h1>
        <Link className="button" to="/responsavel/rotinas/nova">
          <Plus />
          Nova
        </Link>
      </div>
      {routines.map((r) => (
        <Card key={r.id}>
          <h2>{r.title}</h2>
          <p>
            {r.startTime} · {r.estimatedDuration} minutos
          </p>
          <Link to={`/responsavel/rotinas/${r.id}`}>Editar</Link>{" "}
          <button
            onClick={async () => {
              await routinesApi.remove(r.id);
              setRoutines((x) => x.filter((y) => y.id !== r.id));
            }}
          >
            Excluir
          </button>
        </Card>
      ))}
    </div>
  );
}
export function HistoryPage() {
  const { user } = useAuth();
  const [e, setE] = useState<Execution[]>([]);
  useEffect(() => {
    if (user) executionsApi.list(user.uid).then(setE);
  }, [user]);
  return (
    <div>
      <h1>Histórico acolhedor</h1>
      {e.map((x) => (
        <Card key={x.id}>
          <h2>{x.routineTitle}</h2>
          <p>
            {x.executionDate} ·{" "}
            {x.status === "completed"
              ? "Missão concluída"
              : x.status === "paused"
                ? "Missão pausada"
                : "Atividade ainda não concluída"}
          </p>
          <p>
            {x.helpRequested ? "Precisou de ajuda · " : ""}
            {x.starsEarned} estrelas
          </p>
        </Card>
      ))}
    </div>
  );
}
export function SettingsPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [s, setS] = useState<SensorySettings>(
    defaultSettings as SensorySettings,
  );
  useEffect(() => {
    if (user)
      childrenApi.list(user.uid).then((v) => {
        setChildren(v);
        if (v[0]) setChildId(v[0].id);
      });
  }, [user]);
  useEffect(() => {
    if (user && childId)
      loadSettings(user.uid, childId, defaultSettings as SensorySettings).then(
        setS,
      );
  }, [user, childId]);
  return (
    <div>
      <h1>Configurações sensoriais</h1>
      <Card>
        <label>
          Criança
          <select value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {(
          [
            "soundEnabled",
            "voiceEnabled",
            "reducedMotion",
            "highContrast",
            "largeButtons",
            "showTimers",
          ] as const
        ).map((k) => (
          <label className="check" key={k}>
            <input
              type="checkbox"
              checked={s[k]}
              onChange={(e) => setS({ ...s, [k]: e.target.checked })}
            />
            {k}
          </label>
        ))}
        <label>
          Velocidade da voz
          <input
            type="range"
            min="0.6"
            max="1.2"
            step="0.1"
            value={s.speechRate}
            onChange={(e) => setS({ ...s, speechRate: +e.target.value })}
          />
        </label>
        <Button onClick={() => user && saveSettings(user.uid, childId, s)}>
          Salvar preferências
        </Button>
      </Card>
    </div>
  );
}

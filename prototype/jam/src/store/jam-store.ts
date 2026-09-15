import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { avatarSVG } from '@/components/jam/jam-avatar';

interface User {
  id: number;
  username: string;
  email?: string;
  password?: string;
  question?: string;
  answer?: string;
  avatarId: number;
  bio?: string;
  createdAt: number;
  github: boolean;
}

interface Jam {
  id: string;
  name: string;
  desc?: string;
  type: 'public' | 'private';
  ownerId: number;
  members: number[];
  createdAt: number;
  nowPlaying: null;
  messages: { from: number; text: string; ts: number }[];
}

interface Friendship {
  id: number;
  a: number;
  b: number;
  from: number;
  status: 'pending' | 'friends';
}

type AuthView = 'login' | 'signup' | 'forgot';

interface UserMedia {
  id: string;
  file?: File;
  url?: string;
  kind: 'profile';
}

interface JamStore {
  data: {
    users: User[];
    jams: Jam[];
    friendships: Friendship[];
    nextFid: number;
    githubUid: number | null;
    media: UserMedia[];
  };
  session: number | null;
  authView: AuthView;
  currentRoom: string | null;
  modalOpen: boolean;
  modalTitle: string;
  modalBody: string;
  searchQuery: string;

  users: () => User[];
  jams: () => Jam[];
  friendships: () => Friendship[];
  me: () => User | null;
  uidDisplay: (id: number) => string;
  ensureSeed: () => void;
  switchAuthView: (view: AuthView) => void;
  logout: () => void;
  login: (username: string, password: string) => boolean;
  signup: (username: string, email: string, password: string, question: string, answer: string) => boolean;
  githubLogin: () => void;
  forgotUsername: (username: string) => User | null;
  forgotReset: (answer: string, newPass: string, newPass2: string) => boolean;
  saveProfile: (username: string, email: string, bio: string) => boolean;
  setAvatar: (id: number) => void;
  changePassword: (current: string, newPass: string, newPass2: string) => boolean;
  copyId: () => void;
  addFriend: (id: number) => void;
  acceptFriend: (id: number) => void;
  declineFriend: (id: number) => void;
  relation: (a: number, b: number) => 'friends' | 'outgoing' | 'incoming' | null;
  friendsOf: (uid: number) => number[];
  incomingBadge: () => number;
  openJam: (id: string) => void;
  currentRoomJams: () => Jam | null;
  sendMessage: (text: string) => void;
  openInvite: () => void;
  inviteToJam: (fid: number) => void;
  openNewJamModal: () => void;
  createJam: () => void;
  setSearchQuery: (q: string) => void;
  openModal: (title: string, body: string) => void;
  closeModal: () => void;
  avatarSVG: (avatarId: number, idx: string) => string;
  media: () => UserMedia[];
  addMedia: (file: File) => UserMedia | null;
  removeMedia: (id: string) => void;
  clearMedia: () => void;
}

export const useJamStore = create<JamStore>()(
  devtools(
    (set, get) => ({
      data: {
        users: [],
        jams: [] as Jam[],
        friendships: [] as Friendship[],
        nextFid: 1,
        githubUid: null,
        media: [],
      },
      session: null,
      authView: 'login',
      currentRoom: null,
      modalOpen: false,
      modalTitle: '',
      modalBody: '',
      searchQuery: '',

      users: () => get().data.users,
      jams: () => get().data.jams,
      friendships: () => get().data.friendships,
      me: () => {
        const sid = get().session;
        if (!sid) return null;
        return get().data.users.find(u => String(u.id) === String(sid)) || null;
      },
      uidDisplay: (id) => 'JM-' + String(id).padStart(4, '0'),
      ensureSeed: () => {
        const { data } = get();
        if (data.users.length) return;
        const users = [
          { id: 1001, username: 'sara', email: 'sara@jam.dev', password: 'pass123', question: 'What city were you born in?', answer: 'tehran', avatarId: 4, bio: 'sound engineer · lost in delay pedals', createdAt: Date.now() - 90 * 864e5, github: false },
          { id: 1002, username: 'kaveh', email: 'k@jam.dev', password: 'pass123', question: '', answer: '', avatarId: 7, bio: 'synthwave & city lights', createdAt: Date.now() - 80 * 864e5, github: false },
          { id: 1003, username: 'nila', email: 'n@jam.dev', password: 'pass123', question: '', answer: '', avatarId: 9, bio: 'making playlists nobody asked for', createdAt: Date.now() - 70 * 864e5, github: false },
          { id: 1004, username: 'rumi', email: 'r@jam.dev', password: 'pass123', question: '', answer: '', avatarId: 2, bio: 'night owl', createdAt: Date.now() - 60 * 864e5, github: false },
        ];
        const jams = [
          {
            id: 'J1', name: 'Lounge', desc: 'Casual hangout — everyone is welcome.', type: 'public', ownerId: 1001,
            members: [1001, 1002, 1003, 1004],
            createdAt: Date.now() - 30 * 864e5,
            nowPlaying: null,
            messages: [
              { from: 1001, text: 'hey hey, lounge is open', ts: Date.now() - 3600e3 },
              { from: 1002, text: 'perfect, I need a break from synths', ts: Date.now() - 3400e3 },
              { from: 1003, text: 'put me in the cool corner plz', ts: Date.now() - 3200e3 },
            ],
          },
          {
            id: 'J2', name: 'Synthwave Studio', desc: 'Talking music, gear and late-night vibes.', type: 'public', ownerId: 1002,
            members: [1001, 1002, 1003, 1004],
            createdAt: Date.now() - 22 * 864e5,
            nowPlaying: null,
            messages: [
              { from: 1002, text: 'drop your current loop here', ts: Date.now() - 5400e3 },
              { from: 1004, text: 'this one: 128 bpm, all memory of people soon forgotten', ts: Date.now() - 5100e3 },
            ],
          },
          {
            id: 'J3', name: 'Friends Only', desc: 'Private — invite only.', type: 'private', ownerId: 1001,
            members: [1001, 1002, 1003],
            createdAt: Date.now() - 10 * 864e5,
            nowPlaying: null,
            messages: [
              { from: 1003, text: 'is this room also secretly a cult? asking for a friend', ts: Date.now() - 2000e3 },
            ],
          },
        ];
        set({
          data: {
            ...data,
            users,
            jams,
            friendships: [],
            nextFid: 1,
            githubUid: null,
            media: [],
          },
        });
      },
      switchAuthView: (view) => set({ authView: view }),
      logout: () => {
        set({ session: null, currentRoom: null, authView: 'login' });
      },
      login(username, password) {
        const user = get().data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) return false;
        if (user.github) return false;
        if (user.password !== password) return false;
        set({ session: user.id, authView: 'login' });
        return true;
      },
      signup(username, email, password, question, answer) {
        const exists = get().data.users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (exists) return false;
        const id = Math.max(0, ...get().data.users.map(u => u.id)) + 1;
        const newUser: User = {
          id,
          username,
          email: email || '',
          password,
          question,
          answer: answer.toLowerCase(),
          avatarId: Math.floor(Math.random() * 12),
          bio: '',
          createdAt: Date.now(),
          github: false,
        };
        set(state => ({
          data: {
            ...state.data,
            users: [...state.data.users, newUser],
            friendships: [
              ...state.data.friendships,
              { id: state.data.nextFid, a: 1001, b: id, from: 1001, status: 'pending' },
            ],
            nextFid: state.data.nextFid + 1,
          },
          session: id,
          authView: 'login',
        }));
        const jams = get().data.jams;
        if (jams.find(j => j.id === 'J1')) {
          set(state => ({
            data: {
              ...state.data,
              jams: state.data.jams.map(j => j.id === 'J1' ? { ...j, members: [...j.members, id] } : j),
            },
          }));
        }
        if (jams.find(j => j.id === 'J2')) {
          set(state => ({
            data: {
              ...state.data,
              jams: state.data.jams.map(j => j.id === 'J2' ? { ...j, members: [...j.members, id] } : j),
            },
          }));
        }
        return true;
      },
      githubLogin() {
        const { data, session } = get();
        if (session) return;
        let uid = data.githubUid;
        let user = uid ? data.users.find(u => String(u.id) === String(uid)) : null;
        if (!user) {
          let base = 'githero';
          let username = base;
          let n = 2;
          while (data.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            username = base + n++;
          }
          const id = Math.max(0, ...data.users.map(u => u.id)) + 1;
          user = {
            id,
            username,
            email: username + '@github.demo',
            password: undefined,
            question: undefined,
            answer: undefined,
            avatarId: Math.floor(Math.random() * 12),
            bio: 'Signed in with GitHub (demo OAuth)',
            createdAt: Date.now(),
            github: true,
          };
          set(state => ({
            data: {
              ...state.data,
              users: [...state.data.users, user],
              githubUid: user.id,
              friendships: [
                ...state.data.friendships,
                { id: state.data.nextFid, a: 1001, b: user.id, from: 1001, status: 'pending' },
              ],
              nextFid: state.data.nextFid + 1,
            },
            session: user.id,
          }));
        } else {
          set({ session: user.id });
        }
        const jams = get().data.jams;
        if (jams.find(j => j.id === 'J1')) {
          set(state => ({
            data: {
              ...state.data,
              jams: state.data.jams.map(j => j.id === 'J1' ? { ...j, members: [...j.members, (user || {}).id] } : j),
            },
          }));
        }
      },
      forgotUsername(username) {
        const user = get().data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) return null;
        if (!user.question || user.github) return null;
        return user;
      },
      forgotReset(answer, newPass, newPass2) {
        const users = get().data.users;
        const target = users.find(u => u.question && u.answer && u.answer.toLowerCase() === answer.toLowerCase());
        if (!target) return false;
        if (newPass.length < 6) return false;
        if (newPass !== newPass2) return false;
        set(state => ({
          data: {
            ...state.data,
            users: state.data.users.map(u => u && u.id === target.id ? { ...u, password: newPass } : (u as User)),
          },
        }));
        return true;
      },
      saveProfile(username, email, bio) {
        const me = get().me();
        if (!me) return false;
        if (get().data.users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== me.id)) {
          return false;
        }
        set(state => ({
          data: {
            ...state.data,
            users: state.data.users.map(u => u.id === me.id ? { ...u, username, email, bio } : u),
          },
        }));
        return true;
      },
      setAvatar(id) {
        const me = get().me();
        if (!me) return;
        set(state => ({
          data: {
            ...state.data,
            users: state.data.users.map(u => u && u.id === me.id ? { ...u, avatarId: id } : (u as User)),
          },
        }));
      },
      changePassword(current, newPass, newPass2) {
        const me = get().me();
        if (!me) return false;
        if (me.github) return false;
        if (current !== me.password) return false;
        if (newPass.length < 6) return false;
        if (newPass !== newPass2) return false;
        set(state => ({
          data: {
            ...state.data,
            users: state.data.users.map(u => u.id === me.id ? { ...u, password: newPass } : u),
          },
        }));
        return true;
      },
      copyId() {
        const me = get().me();
        if (!me) return;
        const id = get().uidDisplay(me.id);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).catch(() => {});
        }
      },
      addFriend(id) {
        const me = get().me();
        if (!me) return;
        const rel = get().relation(me.id, id);
        if (rel) return;
        const fid = get().data.nextFid;
        set(state => ({
          data: {
            ...state.data,
            friendships: [...state.data.friendships, { id: fid, a: me.id, b: id, from: me.id, status: 'pending' }],
            nextFid: fid + 1,
          },
        }));
      },
      acceptFriend(id) {
        const me = get().me();
        if (!me) return;
        const f = get().data.friendships.find(f => f.status === 'pending' && String(f.b) === String(me.id) && String(f.a) === String(id));
        if (!f) return;
        set(state => ({
          data: {
            ...state.data,
            friendships: state.data.friendships.map(f => f.id === f.id ? { ...f, status: 'friends' } : f),
          },
        }));
      },
      declineFriend(id) {
        const me = get().me();
        if (!me) return;
        set(state => ({
          data: {
            ...state.data,
            friendships: state.data.friendships.filter(f => !(String(f.a) === String(id) && String(f.b) === String(me.id)) && !(String(f.a) === String(me.id) && String(f.b) === String(id))),
          },
        }));
      },
      relation(a, b) {
        const f = get().data.friendships.find(f => (String(f.a) === String(a) && String(f.b) === String(b)) || (String(f.a) === String(b) && String(f.b) === String(a)));
        if (!f) return null;
        if (f.status === 'friends') return 'friends';
        const me = get().me();
        if (!me) return null;
        return String(f.from) === String(me.id) ? 'outgoing' : 'incoming';
      },
      friendsOf(uid) {
        return get().data.friendships.filter(f => f.status === 'friends' && (String(f.a) === String(uid) || String(f.b) === String(uid))).map(f => (String(f.a) === String(uid) ? f.b : f.a));
      },
      incomingBadge() {
        const me = get().me();
        if (!me) return 0;
        return get().data.friendships.filter(f => f.status === 'pending' && String(f.b) === String(me.id)).length;
      },
      openJam(id) {
        const j = get().data.jams.find(x => x.id === id);
        if (!j) return;
        const me = get().me();
        if (!me) return;
        if (!j.members.some(m => String(m) === String(me.id))) return;
        set({ currentRoom: id });
      },
      currentRoomJams: () => {
        const cr = get().currentRoom;
        if (!cr) return null;
        return get().data.jams.find(x => x.id === cr) || null;
      },
      sendMessage(text) {
        const me = get().me();
        if (!me) return;
        const j = get().currentRoomJams();
        if (!j) return;
        if (!text) return;
        set(state => ({
          data: {
            ...state.data,
            jams: state.data.jams.map(jam => jam.id === j.id ? {
              ...jam,
              messages: [...jam.messages, { from: me.id, text, ts: Date.now() }],
            } : jam),
          },
        }));
      },
      openInvite() {
        const cr = get().currentRoomJams();
        if (!cr) return;
        const me = get().me();
        if (!me) return;
        const inRoom = cr.members.map(String);
        const friends = get().friendsOf(me.id).filter(f => !inRoom.includes(String(f)));
        const body = friends.length
          ? `<p class="hint" style="margin:-6px 0 2px">Invite friends</p>`
          : `<p class="hint">No friends to invite yet.</p>`;
        set({ modalTitle: 'Invite friends', modalBody: body, modalOpen: true });
      },
      inviteToJam(fid) {
        const cr = get().currentRoomJams();
        if (!cr) return;
        if (!cr.members.some(m => String(m) === String(fid))) {
          set(state => ({
            data: {
              ...state.data,
              jams: state.data.jams.map(j => j.id === cr.id ? { ...j, members: [...j.members, fid] } : j),
            },
          }));
        }
        set({ modalOpen: false });
      },
      openNewJamModal() {
        set({
          modalTitle: 'New jam',
          modalBody: `
            <label class="field">
              <span class="field-label">Name</span>
              <input class="auth-input" id="nj-name" type="text" placeholder="e.g. Night Shift" maxlength="40" />
            </label>
            <label class="field">
              <span class="field-label">Description <span class="opt">(optional)</span></span>
              <input class="auth-input" id="nj-desc" type="text" placeholder="What's this jam about?" maxlength="120" />
            </label>
            <div class="field">
              <span class="field-label">Type</span>
              <div class="seg">
                <button type="button" class="seg-btn active" data-type="public">Public</button>
                <button type="button" class="seg-btn" data-type="private">Private</button>
              </div>
            </div>
            <button class="btn btn-violet btn-block" id="btn-create-jam">Create jam</button>
          `,
          modalOpen: true,
        });
      },
      createJam() {
        const nameEl = document.getElementById('nj-name') as HTMLInputElement | null;
        const descEl = document.getElementById('nj-desc') as HTMLInputElement | null;
        const type = document.querySelector<HTMLButtonElement>('.seg-btn.active')?.dataset.type || 'public';
        const name = nameEl?.value.trim() || '';
        const desc = descEl?.value.trim() || '';
        if (!name) return;
        const me = get().me();
        if (!me) return;
        const id = 'J' + (Math.max(0, ...get().data.jams.filter(j => j.id[0] === 'J').map(j => parseInt(j.id.slice(1), 10))) + 1);
        const typedType: 'public' | 'private' = type === 'private' ? 'private' : 'public';
        set(state => ({
          data: {
            ...state.data,
            jams: [...state.data.jams, {
              id,
              name,
              desc,
              type: typedType,
              ownerId: me.id,
              members: [me.id],
              createdAt: Date.now(),
              nowPlaying: null,
              messages: [{ from: me.id, text: 'Jam started', ts: Date.now() }],
            }],
          },
          currentRoom: id,
          modalOpen: false,
        }));
      },
      setSearchQuery(q) {
        set({ searchQuery: q });
      },
      openModal(title, body) {
        set({ modalTitle: title, modalBody: body, modalOpen: true });
      },
      closeModal() {
        set({ modalOpen: false, modalTitle: '', modalBody: '' });
      },
      avatarSVG: avatarSVG,
      media: () => get().data.media.filter(m => m.kind === 'profile'),
      addMedia(file) {
        const me = get().me();
        if (!me) return null;
        const existing = get().data.media.filter(m => m.kind === 'profile').length;
        if (existing >= 5) return null;
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) return null;
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) return null;
        const id = 'm' + Date.now() + Math.random().toString(36).slice(2, 6);
        const url = URL.createObjectURL(file);
        set(state => ({
          data: {
            ...state.data,
            media: [...state.data.media, { id, file, url, kind: 'profile' }],
          },
        }));
        return { id, file, url, kind: 'profile' } as UserMedia;
      },
      removeMedia(id) {
        set(state => {
          const entry = state.data.media.find(m => m.id === id);
          if (entry?.url) URL.revokeObjectURL(entry.url);
          return {
            data: {
              ...state.data,
              media: state.data.media.filter(m => m.id !== id),
            },
          };
        });
      },
      clearMedia() {
        set(state => {
          for (const m of state.data.media) {
            if (m.url) URL.revokeObjectURL(m.url);
          }
          return {
            data: {
              ...state.data,
              media: [],
            },
          };
        });
      },
    }),
    { name: 'jam-store' }
  )
);

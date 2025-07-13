import { PeerJSPeerAdapter }   from '../adapters/peerAdapterPeerJS';
import {
  newDoc,
  applyLocalChange,
  encodeChanges,
  mergeRemoteChanges
} from '../domain/HealthRecord';


/* ————— small helper so we can poke from dev-tools ————— */
declare global {
  interface Window {
    peerA?: DemoPeer;
    peerB?: DemoPeer;
    join?: (id: string) => void;
  }
}

class DemoPeer {
  adapter = new PeerJSPeerAdapter();
  doc = newDoc();

  constructor() {
    this.adapter.onMessage(payload => {
      this.doc = mergeRemoteChanges(this.doc, [payload]);
      console.log('merged value', this.doc.bloodPressure);
    });
  }

  async start(remoteId?: string) {
    await this.adapter.connect(remoteId);
    console.log('my id', this.adapter.id);
  }

  edit() {
    this.doc = applyLocalChange(this.doc, d => (d.bloodPressure += 1));
    const delta = encodeChanges(newDoc(), this.doc); // diff from blank for demo
    this.adapter.send(delta[0]);
  }
}

/* attach helpers to window for quick manual play */
window.peerA = new DemoPeer();
window.peerB = new DemoPeer();
window.join = async (id: string) => {
  await window.peerB!.start(id);
};

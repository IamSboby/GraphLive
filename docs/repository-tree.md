# Árbol completo del código entregado

Se omiten dependencias instaladas, compilación, datos, metadatos Git y temporales.

```text
GraphLive/
├── .dockerignore
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── pages.yml
├── .gitignore
├── .prettierignore
├── CHANGELOG.md
├── Dockerfile
├── LICENSE
├── README.en.md
├── README.md
├── THIRD_PARTY_NOTICES.md
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── network/
│   │       ├── backups/
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── globals.css
│   ├── graph/
│   │   └── page.tsx
│   ├── icon.svg
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   └── page.tsx
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── contributing.md
│   ├── data-model.md
│   ├── deployment.md
│   ├── github-pages.md
│   ├── repository-tree.md
│   ├── sbobypishare-integration.md
│   ├── screenshots/
│   │   ├── alpha-form-en.png
│   │   ├── home.png
│   │   ├── login.png
│   │   ├── mobile.png
│   │   └── network.png
│   ├── security.md
│   ├── storage.md
│   └── synchronization.md
├── eslint.config.mjs
├── instrumentation.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── packages/
│   ├── auth/
│   │   └── server.ts
│   ├── config/
│   │   └── index.ts
│   ├── domain/
│   │   ├── demo.ts
│   │   ├── gender.ts
│   │   └── model.ts
│   ├── graph-engine/
│   │   ├── layout.ts
│   │   ├── layout.worker.ts
│   │   └── metrics.ts
│   ├── i18n/
│   │   └── index.ts
│   ├── security/
│   │   ├── backup.ts
│   │   └── logger.ts
│   ├── storage-adapters/
│   │   ├── api.ts
│   │   ├── browser.ts
│   │   ├── indexeddb.ts
│   │   ├── sbobypishare.ts
│   │   └── server.ts
│   ├── storage-core/
│   │   ├── export.ts
│   │   └── index.ts
│   ├── sync-engine/
│   │   └── merge.ts
│   └── ui/
│       ├── app.tsx
│       ├── application-page.tsx
│       ├── connection-form.tsx
│       ├── details.tsx
│       ├── filters.tsx
│       ├── flags.ts
│       ├── graph.tsx
│       ├── onboarding.tsx
│       ├── person-form.tsx
│       ├── primitives.tsx
│       ├── settings.tsx
│       └── store.ts
├── playwright.config.ts
├── playwright.pages.config.ts
├── postcss.config.mjs
├── proxy.ts
├── public/
│   └── flags/
│       ├── LICENSE.txt
│       ├── ad.svg
│       ├── ae.svg
│       ├── af.svg
│       ├── ag.svg
│       ├── ai.svg
│       ├── al.svg
│       ├── am.svg
│       ├── ao.svg
│       ├── aq.svg
│       ├── ar.svg
│       ├── arab.svg
│       ├── as.svg
│       ├── asean.svg
│       ├── at.svg
│       ├── au.svg
│       ├── aw.svg
│       ├── ax.svg
│       ├── az.svg
│       ├── ba.svg
│       ├── bb.svg
│       ├── bd.svg
│       ├── be.svg
│       ├── bf.svg
│       ├── bg.svg
│       ├── bh.svg
│       ├── bi.svg
│       ├── bj.svg
│       ├── bl.svg
│       ├── bm.svg
│       ├── bn.svg
│       ├── bo.svg
│       ├── bq.svg
│       ├── br.svg
│       ├── bs.svg
│       ├── bt.svg
│       ├── bv.svg
│       ├── bw.svg
│       ├── by.svg
│       ├── bz.svg
│       ├── ca.svg
│       ├── cc.svg
│       ├── cd.svg
│       ├── cefta.svg
│       ├── cf.svg
│       ├── cg.svg
│       ├── ch.svg
│       ├── ci.svg
│       ├── ck.svg
│       ├── cl.svg
│       ├── cm.svg
│       ├── cn.svg
│       ├── co.svg
│       ├── cp.svg
│       ├── cr.svg
│       ├── cu.svg
│       ├── cv.svg
│       ├── cw.svg
│       ├── cx.svg
│       ├── cy.svg
│       ├── cz.svg
│       ├── de.svg
│       ├── dg.svg
│       ├── dj.svg
│       ├── dk.svg
│       ├── dm.svg
│       ├── do.svg
│       ├── dz.svg
│       ├── eac.svg
│       ├── ec.svg
│       ├── ee.svg
│       ├── eg.svg
│       ├── eh.svg
│       ├── er.svg
│       ├── es-ct.svg
│       ├── es-ga.svg
│       ├── es-pv.svg
│       ├── es.svg
│       ├── et.svg
│       ├── eu.svg
│       ├── fi.svg
│       ├── fj.svg
│       ├── fk.svg
│       ├── fm.svg
│       ├── fo.svg
│       ├── fr.svg
│       ├── ga.svg
│       ├── gb-eng.svg
│       ├── gb-nir.svg
│       ├── gb-sct.svg
│       ├── gb-wls.svg
│       ├── gb.svg
│       ├── gd.svg
│       ├── ge.svg
│       ├── gf.svg
│       ├── gg.svg
│       ├── gh.svg
│       ├── gi.svg
│       ├── gl.svg
│       ├── gm.svg
│       ├── gn.svg
│       ├── gp.svg
│       ├── gq.svg
│       ├── gr.svg
│       ├── gs.svg
│       ├── gt.svg
│       ├── gu.svg
│       ├── gw.svg
│       ├── gy.svg
│       ├── hk.svg
│       ├── hm.svg
│       ├── hn.svg
│       ├── hr.svg
│       ├── ht.svg
│       ├── hu.svg
│       ├── ic.svg
│       ├── id.svg
│       ├── ie.svg
│       ├── il.svg
│       ├── im.svg
│       ├── in.svg
│       ├── io.svg
│       ├── iq.svg
│       ├── ir.svg
│       ├── is.svg
│       ├── it.svg
│       ├── je.svg
│       ├── jm.svg
│       ├── jo.svg
│       ├── jp.svg
│       ├── ke.svg
│       ├── kg.svg
│       ├── kh.svg
│       ├── ki.svg
│       ├── km.svg
│       ├── kn.svg
│       ├── kp.svg
│       ├── kr.svg
│       ├── kw.svg
│       ├── ky.svg
│       ├── kz.svg
│       ├── la.svg
│       ├── lb.svg
│       ├── lc.svg
│       ├── li.svg
│       ├── lk.svg
│       ├── lr.svg
│       ├── ls.svg
│       ├── lt.svg
│       ├── lu.svg
│       ├── lv.svg
│       ├── ly.svg
│       ├── ma.svg
│       ├── mc.svg
│       ├── md.svg
│       ├── me.svg
│       ├── mf.svg
│       ├── mg.svg
│       ├── mh.svg
│       ├── mk.svg
│       ├── ml.svg
│       ├── mm.svg
│       ├── mn.svg
│       ├── mo.svg
│       ├── mp.svg
│       ├── mq.svg
│       ├── mr.svg
│       ├── ms.svg
│       ├── mt.svg
│       ├── mu.svg
│       ├── mv.svg
│       ├── mw.svg
│       ├── mx.svg
│       ├── my.svg
│       ├── mz.svg
│       ├── na.svg
│       ├── nc.svg
│       ├── ne.svg
│       ├── nf.svg
│       ├── ng.svg
│       ├── ni.svg
│       ├── nl.svg
│       ├── no.svg
│       ├── np.svg
│       ├── nr.svg
│       ├── nu.svg
│       ├── nz.svg
│       ├── om.svg
│       ├── pa.svg
│       ├── pc.svg
│       ├── pe.svg
│       ├── pf.svg
│       ├── pg.svg
│       ├── ph.svg
│       ├── pk.svg
│       ├── pl.svg
│       ├── pm.svg
│       ├── pn.svg
│       ├── pr.svg
│       ├── ps.svg
│       ├── pt.svg
│       ├── pw.svg
│       ├── py.svg
│       ├── qa.svg
│       ├── re.svg
│       ├── ro.svg
│       ├── rs.svg
│       ├── ru.svg
│       ├── rw.svg
│       ├── sa.svg
│       ├── sb.svg
│       ├── sc.svg
│       ├── sd.svg
│       ├── se.svg
│       ├── sg.svg
│       ├── sh-ac.svg
│       ├── sh-hl.svg
│       ├── sh-ta.svg
│       ├── sh.svg
│       ├── si.svg
│       ├── sj.svg
│       ├── sk.svg
│       ├── sl.svg
│       ├── sm.svg
│       ├── sn.svg
│       ├── so.svg
│       ├── sr.svg
│       ├── ss.svg
│       ├── st.svg
│       ├── sv.svg
│       ├── sx.svg
│       ├── sy.svg
│       ├── sz.svg
│       ├── tc.svg
│       ├── td.svg
│       ├── tf.svg
│       ├── tg.svg
│       ├── th.svg
│       ├── tj.svg
│       ├── tk.svg
│       ├── tl.svg
│       ├── tm.svg
│       ├── tn.svg
│       ├── to.svg
│       ├── tr.svg
│       ├── tt.svg
│       ├── tv.svg
│       ├── tw.svg
│       ├── tz.svg
│       ├── ua.svg
│       ├── ug.svg
│       ├── um.svg
│       ├── un.svg
│       ├── us.svg
│       ├── uy.svg
│       ├── uz.svg
│       ├── va.svg
│       ├── vc.svg
│       ├── ve.svg
│       ├── vg.svg
│       ├── vi.svg
│       ├── vn.svg
│       ├── vu.svg
│       ├── wf.svg
│       ├── ws.svg
│       ├── xk.svg
│       ├── xx.svg
│       ├── ye.svg
│       ├── yt.svg
│       ├── za.svg
│       ├── zm.svg
│       └── zw.svg
├── scripts/
│   ├── benchmark.mjs
│   ├── benchmark.ts
│   ├── build-pages.mjs
│   ├── package.mjs
│   └── serve-pages.mjs
├── tests/
│   ├── auth.test.ts
│   ├── domain.test.ts
│   ├── e2e/
│   │   ├── alpha.spec.ts
│   │   ├── app.spec.ts
│   │   ├── direct-connection.spec.ts
│   │   ├── flags.spec.ts
│   │   ├── navigation.spec.ts
│   │   └── theme.spec.ts
│   ├── integration/
│   │   ├── local.test.ts
│   │   └── storage.test.ts
│   ├── layout.test.ts
│   ├── pages/
│   │   └── storage.spec.ts
│   ├── security.test.ts
│   └── store.test.ts
├── tsconfig.json
└── vitest.config.ts
```

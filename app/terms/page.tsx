import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../../packages/ui/legal-page";
export const metadata: Metadata = {
  title: "Condiciones del servicio · GraphLive",
  description:
    "Condiciones de uso de GraphLive y de sus funciones de almacenamiento y redes compartidas.",
  alternates: { canonical: "https://iamsboby.github.io/GraphLive/terms/" },
  robots: { index: true, follow: true },
};
export default function TermsPage() {
  return (
    <LegalPage title="Condiciones del servicio">
      <h2>Servicio y contacto</h2>
      <p>
        GraphLive es una aplicación para organizar redes de personas y
        conexiones. Estas condiciones corresponden a la versión pública alojada
        en iamsboby.github.io/GraphLive. El contacto del responsable es{" "}
        <a href="mailto:Iamsboby@gmail.com">Iamsboby@gmail.com</a>.
      </p>
      <p>
        Al utilizar GraphLive, debes respetar estas condiciones y la normativa
        aplicable. Si no estás de acuerdo, deja de utilizar la aplicación;
        puedes conservar las copias de tus datos que hayas exportado.
      </p>
      <h2>Uso permitido y contenido</h2>
      <p>
        Conservas los derechos que te correspondan sobre el contenido que
        introduces. Autorizas únicamente el procesamiento necesario para
        mostrarlo, editarlo y guardarlo en el almacenamiento elegido, y para
        compartirlo cuando lo solicites.
      </p>
      <p>
        Eres responsable de disponer de autorización o fundamento suficiente
        para registrar y compartir información sobre otras personas. No utilices
        GraphLive para actividades ilegales, acoso, divulgación no autorizada de
        datos, vulneración de derechos de terceros o acceso a redes ajenas sin
        permiso.
      </p>
      <h2>Almacenamiento y copias</h2>
      <p>
        Eliges dónde guardar tus redes. El almacenamiento del navegador depende
        del dispositivo y puede desaparecer si borras sus datos. La carpeta
        local depende de sus permisos y disponibilidad. Google Drive requiere
        una cuenta, autorización y disponibilidad del servicio de Google.
      </p>
      <p>
        Los cambios pendientes pueden guardarse localmente y sincronizarse
        después. Comprueba el estado del guardado y conserva exportaciones de la
        información importante. Los backups automáticos tienen límites de
        conservación y no sustituyen tus propias copias.
      </p>
      <h2>Colaboración</h2>
      <p>
        Compartir una red concede acceso a su contenido completo con el permiso
        seleccionado. Quienes tengan permiso de edición pueden modificarla. Los
        cambios simultáneos pueden requerir resolver conflictos. Revisa los
        destinatarios antes de enviar una invitación y gestiona o revoca los
        permisos desde Google Drive. La revocación no recupera copias que otras
        personas ya hayan descargado.
      </p>
      <h2>Disponibilidad y versión preliminar</h2>
      <p>
        GraphLive está en fase de versión candidata (prerelease). Puede contener
        errores, cambiar de funcionalidad o sufrir interrupciones. No se promete
        disponibilidad continua ni ausencia de pérdida de datos. Los servicios
        de terceros, incluidos Google Drive y GitHub, se rigen también por sus
        propias condiciones.
      </p>
      <p>
        GraphLive no sustituye registros profesionales ni debe ser la única
        copia de información crítica. Estas condiciones no excluyen los derechos
        irrenunciables de los usuarios ni las responsabilidades que no puedan
        limitarse legalmente.
      </p>
      <h2>Privacidad</h2>
      <p>
        La <Link href="/privacy/">política de privacidad</Link> explica qué
        datos utiliza GraphLive, dónde se guardan, los permisos de Google y las
        opciones para eliminarlos o revocar el acceso.
      </p>
      <h2>Fin del uso y cambios</h2>
      <p>
        Puedes dejar de utilizar GraphLive cuando quieras, exportar tu
        información, revocar la conexión de Google y eliminar las copias que
        controles. Las modificaciones de estas condiciones se publicarán aquí
        con su fecha de actualización. Para consultas o incidencias, contacta
        con <a href="mailto:Iamsboby@gmail.com">Iamsboby@gmail.com</a>.
      </p>
    </LegalPage>
  );
}

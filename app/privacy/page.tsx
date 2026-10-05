import type { Metadata } from "next";
import { LegalPage } from "../../packages/ui/legal-page";
export const metadata: Metadata = {
  title: "Política de privacidad · GraphLive",
  description:
    "Cómo GraphLive utiliza, guarda y comparte tus datos y los permisos de Google Drive.",
  alternates: { canonical: "https://iamsboby.github.io/GraphLive/privacy/" },
  robots: { index: true, follow: true },
};
export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <h2>Responsable y contacto</h2>
      <p>
        Esta política corresponde a la versión pública de GraphLive alojada en
        iamsboby.github.io/GraphLive. El contacto del responsable de GraphLive
        para privacidad, soporte y solicitudes sobre datos es{" "}
        <a href="mailto:Iamsboby@gmail.com">Iamsboby@gmail.com</a>. Las
        instalaciones independientes pueden tener responsables y condiciones de
        almacenamiento diferentes.
      </p>
      <h2>Datos que utiliza la aplicación</h2>
      <p>
        GraphLive procesa la información que introduces para crear tus redes:
        nombres, perfiles, fechas, identidades, etiquetas, intereses, notas,
        conexiones, percepciones y posiciones del gráfico, además de tus
        preferencias de idioma y apariencia. Algunas entradas pueden contener
        información delicada sobre ti o sobre otras personas. Introduce
        únicamente datos necesarios que estés autorizado a utilizar.
      </p>
      <p>
        Estos datos se utilizan para mostrar, editar, buscar, guardar, recuperar
        y, cuando lo solicitas, compartir tus redes. GraphLive no incorpora
        publicidad ni herramientas propias de analítica o seguimiento, y no
        vende los datos de tus redes.
      </p>
      <h2>Dónde se guardan</h2>
      <p>
        Con almacenamiento en el navegador, las redes permanecen en la base de
        datos local de ese navegador. Con una carpeta del dispositivo, se
        guardan en la carpeta elegida, cuando el navegador permite esta opción.
        Los ajustes y los cambios pendientes de sincronización también pueden
        conservarse localmente para recuperarlos tras cerrar o recargar la
        página.
      </p>
      <p>
        Si eliges Google Drive, GraphLive transmite el contenido de la red a las
        APIs de Google para guardarlo en tu cuenta. Las redes privadas se
        almacenan en el espacio de datos de la aplicación; al compartir una red
        se crea un archivo de red en una carpeta normal de Drive y se utiliza
        ese archivo común. El servidor estático de GraphLive no recibe el
        contenido de las redes como parte de este guardado.
      </p>
      <h2>Permisos y datos de Google</h2>
      <p>
        La conexión con Google es opcional y requiere tu autorización. El
        permiso drive.appdata permite gestionar los datos propios de GraphLive.
        El permiso drive.file, solicitado para las funciones compartidas,
        permite acceder a archivos creados por GraphLive o seleccionados
        expresamente mediante Google Picker; no concede acceso general a todo tu
        Drive.
      </p>
      <p>
        GraphLive utiliza un identificador de la cuenta proporcionado por Google
        para separar el almacenamiento y evitar guardar cambios en una cuenta
        distinta. El token de acceso se mantiene en memoria durante la sesión.
        No solicitamos ni almacenamos tu contraseña de Google.
      </p>
      <p>
        El uso y la transferencia de información recibida de las APIs de Google
        se ajustan a la{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">
          Política de Datos de Usuario de los Servicios API de Google
        </a>
        , incluidos los requisitos de uso limitado. Los datos de Google se
        utilizan para las funciones de almacenamiento, recuperación y
        colaboración solicitadas por el usuario, y no para publicidad ni venta
        de información.
      </p>
      <h2>Redes compartidas y destinatarios</h2>
      <p>
        Al enviar una invitación, Google recibe la dirección de correo del
        destinatario y el permiso elegido: lectura o edición. El destinatario
        obtiene acceso al archivo de la red completo, incluidas sus personas,
        notas y conexiones. Comparte únicamente con personas autorizadas y con
        el consentimiento o fundamento que corresponda para la información de
        terceros.
      </p>
      <p>
        Los backups creados por GraphLive permanecen en el almacenamiento
        privado de cada participante. Una persona con acceso puede conservar
        copias del contenido que ha consultado. Retirar el acceso en Drive
        impide futuros accesos sujetos a sus permisos, pero no elimina copias ya
        descargadas o guardadas por otras personas.
      </p>
      <h2>Proveedores y comunicaciones</h2>
      <p>
        GitHub Pages sirve los archivos públicos de la web y puede procesar
        datos técnicos de conexión, como la dirección IP, conforme a sus propias
        políticas. Si utilizas Google Drive, Google procesa los datos enviados y
        la autorización conforme a sus políticas. Estos proveedores pueden
        tratar información en distintos países. Consulta la{" "}
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
          declaración de privacidad de GitHub
        </a>{" "}
        y la{" "}
        <a href="https://policies.google.com/privacy">
          política de privacidad de Google
        </a>
        .
      </p>
      <p>
        Si escribes al correo de soporte, el responsable recibe tu dirección y
        el contenido que envíes para atender la consulta. Evita adjuntar redes
        completas o datos sensibles si no son necesarios. Las comunicaciones se
        conservan durante el tiempo necesario para atender la solicitud y las
        obligaciones aplicables.
      </p>
      <h2>Conservación, eliminación y revocación</h2>
      <p>
        Las redes se conservan en el almacenamiento que hayas elegido hasta que
        las elimines. Borrar personas de la red activa no borra de inmediato las
        versiones anteriores de los backups. Las copias automáticas se someten a
        rotación; las copias manuales o exportadas pueden conservarse hasta que
        las elimines expresamente.
      </p>
      <p>
        Puedes editar o eliminar información desde GraphLive y exportar tus
        datos. Para eliminar todas las copias, revisa también los backups, los
        archivos exportados, la carpeta elegida, los datos locales del navegador
        y, si corresponde, los archivos y la papelera de Drive. Los datos
        privados de la aplicación pueden gestionarse desde Configuración →
        Administrar aplicaciones en Google Drive. Ten en cuenta que borrar datos
        locales puede eliminar cambios aún no sincronizados.
      </p>
      <p>
        Puedes revocar la conexión desde{" "}
        <a href="https://myaccount.google.com/connections">
          las conexiones de tu cuenta de Google
        </a>
        . Revocar el permiso detiene el acceso autorizado futuro, pero no
        elimina por sí solo los archivos guardados. Antes de volver a conectar,
        elimina también los cambios locales pendientes que no quieras recuperar.
      </p>
      <h2>Tus solicitudes y seguridad</h2>
      <p>
        Para consultas o para ejercer los derechos de acceso, rectificación,
        eliminación, oposición, limitación o portabilidad que correspondan según
        la normativa aplicable, escribe a{" "}
        <a href="mailto:Iamsboby@gmail.com">Iamsboby@gmail.com</a>. El
        responsable no puede acceder por defecto a las redes almacenadas
        únicamente en tu dispositivo o Drive; puede orientarte sobre cómo
        gestionarlas sin que tengas que enviarlas.
      </p>
      <p>
        Protege tu dispositivo y tu cuenta de Google. GraphLive utiliza
        conexiones HTTPS con Google y los permisos de Drive, pero no añade
        cifrado de extremo a extremo propio a los archivos JSON. No existe
        garantía de seguridad absoluta.
      </p>
      <h2>Cambios en esta política</h2>
      <p>
        Las actualizaciones se publicarán en esta página con su fecha. Si se
        añaden usos de datos que requieran autorización adicional, se solicitará
        antes de habilitarlos.
      </p>
    </LegalPage>
  );
}

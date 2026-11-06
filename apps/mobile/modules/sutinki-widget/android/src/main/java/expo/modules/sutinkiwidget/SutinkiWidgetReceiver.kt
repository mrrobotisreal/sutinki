package expo.modules.sutinkiwidget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/** The AppWidget provider. Declared in this module's own manifest (survives `prebuild --clean`). */
class SutinkiWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = SutinkiWidget()
}

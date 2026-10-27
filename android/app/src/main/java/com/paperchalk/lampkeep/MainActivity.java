package com.paperchalk.lampkeep;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.graphics.Insets;
import android.util.Base64;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.widget.Toast;
import android.widget.FrameLayout;
import java.io.OutputStream;

public final class MainActivity extends Activity {
 private static final String HOME="https://g2066203208-beep.github.io/paperchalk-world/";
 private static final int OPEN_REQUEST=9321, SAVE_REQUEST=9322;
 private WebView web;
 private ValueCallback<Uri[]> pendingOpen;
 private byte[] pendingSave;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(32,43,50));
  getWindow().setNavigationBarColor(Color.rgb(32,43,50));
  web=new WebView(this);web.setBackgroundColor(Color.rgb(188,196,195));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setUseWideViewPort(true);
  web.getSettings().setLoadWithOverviewMode(false);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(true);
  web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
  web.getSettings().setTextZoom(100);
  web.addJavascriptInterface(new ExportBridge(),"AndroidFile");
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(pendingOpen!=null)pendingOpen.onReceiveValue(null);
    pendingOpen=callback;
    try{
     Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
     intent.addCategory(Intent.CATEGORY_OPENABLE);
     intent.setType("*/*");
     intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","application/octet-stream","text/plain"});
     startActivityForResult(intent,OPEN_REQUEST);return true;
    }catch(Exception ex){pendingOpen=null;return false;}
   }
  });
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri u=request.getUrl();String path=u.getPath();
    if("https".equals(u.getScheme())&&"g2066203208-beep.github.io".equals(u.getHost())&&path!=null&&path.startsWith("/paperchalk-world/"))return false;
    try{startActivity(new Intent(Intent.ACTION_VIEW,u));}
    catch(Exception e){Toast.makeText(MainActivity.this,"无法打开外部链接",Toast.LENGTH_SHORT).show();}
    return true;
   }
  });
  FrameLayout root=new FrameLayout(this);
  root.addView(web,new FrameLayout.LayoutParams(-1,-1));
  if(Build.VERSION.SDK_INT>=30){
   root.setOnApplyWindowInsetsListener((view,insets)->{
    Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
    FrameLayout.LayoutParams p=(FrameLayout.LayoutParams)web.getLayoutParams();
    p.setMargins(safe.left,safe.top,safe.right,safe.bottom);
    web.setLayoutParams(p);return insets;
   });
  }
  setContentView(root);
  root.requestApplyInsets();
  if(state==null||web.restoreState(state)==null)web.loadUrl(HOME+"?source=apk&launch="+System.currentTimeMillis());
 }
 private final class ExportBridge{
  @JavascriptInterface public void saveBase64(String name,String base64,String mime){
   try{
    if(base64.length()>25000000)throw new IllegalArgumentException("文件过大");
    final byte[] bytes=Base64.decode(base64,Base64.DEFAULT);
    final String safe=name.replaceAll("[^\\p{L}\\p{N}._-]","_").substring(0,Math.min(name.length(),100));
    runOnUiThread(()->{
     pendingSave=bytes;
     try{
      Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.setType(mime);
      intent.putExtra(Intent.EXTRA_TITLE,safe);
      startActivityForResult(intent,SAVE_REQUEST);
     }catch(Exception ex){pendingSave=null;Toast.makeText(MainActivity.this,"文件保存失败",Toast.LENGTH_SHORT).show();}
    });
   }catch(Exception ex){runOnUiThread(()->Toast.makeText(MainActivity.this,"保存失败："+ex.getMessage(),Toast.LENGTH_SHORT).show());}
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==OPEN_REQUEST){
   if(pendingOpen!=null){pendingOpen.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);pendingOpen=null;}
  }else if(request==SAVE_REQUEST){
   if(result==RESULT_OK&&data!=null&&data.getData()!=null&&pendingSave!=null){
    try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out!=null)out.write(pendingSave);}
    catch(Exception ex){Toast.makeText(this,"保存失败："+ex.getMessage(),Toast.LENGTH_LONG).show();}
   }pendingSave=null;
  }
 }
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}

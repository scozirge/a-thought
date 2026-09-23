using System.Linq;
using System.Text;
using UnityEngine;

namespace RivalsPrototype {
  public static class DuelNames {
    // 20 animals × 5 simple prefixes = 100 distinct, short Chinese names.
    public static readonly string[] All=(from prefix in new[]{"","小","胖","甜","萌"}
      from animal in new[]{"貓貓","狗狗","兔兔","熊熊","狐狐","鹿鹿","鼠鼠","鴨鴨","鵝鵝","豬豬","虎虎","獅獅","羊羊","牛牛","馬馬","猴猴","鯨鯨","企鵝","海獺","熊貓"}
      select prefix+animal).ToArray();
    public static string RandomName()=>All[Random.Range(0,All.Length)];
    public static string Clean(string name) {
      var text=new StringBuilder();
      foreach(char c in name??"")if((char.IsLetterOrDigit(c)||c=='_'||c=='-')&&text.Length<10)text.Append(c);
      return text.Length==0?"貓貓":text.ToString();
    }
  }
}

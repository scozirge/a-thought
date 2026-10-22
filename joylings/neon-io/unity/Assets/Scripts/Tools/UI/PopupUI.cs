using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
namespace Scoz.Func
{
    public class PopupUI : MonoBehaviour
    {

        public static bool IsInit { get; private set; }
        static PopupUI Myself;
        [SerializeField]
        GameObject ConfirmCancelGo = null;
        public Canvas MyCanvas;
        [SerializeField]
        Text ConfrimCancelText = null;
        public delegate void MyFunc();
        public MyFunc MyConfirmFunc;
        public MyFunc MyCancelFunc;
        public MyFunc MyClickCancelFunc;


        [SerializeField]
        GameObject LoadingGo = null;
        [SerializeField]
        Text Loading_Value = null;

        [SerializeField]
        GameObject ClickCancelGo = null;
        [SerializeField]
        Text ClickCancel_Value = null;

        [SerializeField]
        GameObject LoadingTitleGo = null;
        [SerializeField]
        Text LoadingTitle = null;
        [SerializeField]
        Text LoadingValue = null;

        [SerializeField]
        GameObject ClickCancelTitleGo = null;
        [SerializeField]
        Text ClickCancelTitle = null;
        [SerializeField]
        Text ClickCancelValue = null;

        [SerializeField]
        GameObject RestartGo = null;
        [SerializeField]
        Text Restart_Value = null;

        [SerializeField]
        List<Book> MyBooks = null;




        [SerializeField]
        Animator CutSceneAni = null;

        [SerializeField]
        GameObject TipObj = null;
        [SerializeField]
        Text TipText = null;
        [SerializeField]
        HorizontalLayoutGroup TipHLayoutGroup = null;
        [SerializeField]
        RectTransform TipBottomRectTrans = null;

        public void Init()
        {
            Myself = this;
            IsInit = true;
            DontDestroyOnLoad(gameObject);
        }
        public static void SetCameral(Camera _cam)
        {
            Myself.MyCanvas.worldCamera = _cam;
        }
        public static void ShowConfirmCancel(string _text, MyFunc _confirmFunc, MyFunc _cancelFunc)
        {
            if (!Myself)
                return;
            AudioPlayer.PlaySoundByDic_Static("Popup");
            Myself.MyConfirmFunc = _confirmFunc;
            Myself.MyCancelFunc = _cancelFunc;
            Myself.ConfirmCancelGo.SetActive(true);
            Myself.ConfrimCancelText.text = _text;
        }
        public static void HideConfirmCancel()
        {
            if (!Myself)
                return;
            Myself.ConfirmCancelGo.SetActive(false);
        }
        public void Confirm()
        {
            AudioPlayer.PlaySoundByDic_Static("Click");
            if (MyConfirmFunc != null)
                MyConfirmFunc();
            HideConfirmCancel();
        }
        public void Cancel()
        {
            AudioPlayer.PlaySoundByDic_Static("Click");
            if (MyCancelFunc != null)
                MyCancelFunc();
            HideConfirmCancel();
        }

        public static void ShowLoading(string _text)
        {
            if (!Myself)
                return;
            AudioPlayer.PlaySoundByDic_Static("Popup");
            Myself.LoadingGo.SetActive(true);
            Myself.Loading_Value.text = _text;
        }
        public static void ShowRestart(string _text)
        {
            if (!Myself)
                return;
            AudioPlayer.PlaySoundByDic_Static("Popup");
            Myself.RestartGo.SetActive(true);
            Myself.Restart_Value.text = _text;
        }
        public static void HideLoading()
        {
            if (!Myself)
                return;
            Myself.LoadingGo.SetActive(false);
        }
        public static void ShowClickCancel(string _text, MyFunc _cancelFunc)
        {
            if (!Myself)
                return;
            AudioPlayer.PlaySoundByDic_Static("Popup");
            Myself.ClickCancelGo.SetActive(true);
            Myself.ClickCancel_Value.text = _text;
            Myself.MyClickCancelFunc = _cancelFunc;
        }
        public void HidewClickCancel()
        {
            if (MyClickCancelFunc != null)
                MyClickCancelFunc();
            ClickCancelGo.SetActive(false);
        }
        public static void ShowTitleLoading(string _title, string _value)
        {
            if (!Myself)
                return;
            AudioPlayer.PlaySoundByDic_Static("Popup");
            Myself.LoadingTitleGo.SetActive(true);
            Myself.LoadingTitle.text = _title;
            Myself.LoadingValue.text = _value;
        }
        public static void HidewTitleLoading()
        {
            if (!Myself)
                return;
            Myself.LoadingTitleGo.SetActive(false);
        }
        public static void ShowTitleClickCancel(string _title, string _value)
        {
            if (!Myself)
                return;
            AudioPlayer.PlaySoundByDic_Static("Popup");
            Myself.ClickCancelTitleGo.SetActive(true);
            Myself.ClickCancelTitle.text = _title;
            Myself.ClickCancelValue.text = _value;
        }
        public static void HideClickCancelTitle()
        {
            if (!Myself)
                return;
            Myself.ClickCancelTitleGo.SetActive(false);
        }
        public void HidekCancelTitle()
        {
            ClickCancelTitleGo.SetActive(false);
        }
        public static void CallCutScene()
        {
            Myself.CutSceneAni.SetTrigger("Play");
        }
        public static void ShowTip(string _text, Vector2 _pivot, Vector2 _pos)
        {
            AudioPlayer.PlaySoundByDic_Static("Hover");
            Myself.TipText.text = _text;
            Myself.TipBottomRectTrans.pivot = _pivot;
            Myself.TipObj.transform.position = _pos + (Vector2)Myself.transform.position;

            Myself.TipObj.SetActive(true);
            Canvas.ForceUpdateCanvases();
            Myself.TipHLayoutGroup.enabled = false;
            Myself.TipHLayoutGroup.enabled = true;
        }
        public static void HidTip()
        {
            Myself.TipObj.SetActive(false);
        }
        public static void ShowTutorial_Static(bool _show, int _index)
        {
            Myself.MyBooks[_index].gameObject.SetActive(_show);
        }
        public void ShowTutorial(bool _show,int _index)
        {
            MyBooks[_index].gameObject.SetActive(_show);
            UnityAnalyst.SendWatchTutorial();
        }
    }
}
